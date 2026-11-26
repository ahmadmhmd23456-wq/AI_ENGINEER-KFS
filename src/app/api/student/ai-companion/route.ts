import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { encryptForUser, decryptForUser } from "@/lib/ai-crypto";
import {
  getStudentLearningContext,
  generateAiCompanionReply,
  sendPhoneReminderToStudent,
  encodeChatPayload,
  decodeChatPayload,
  extractFirstName,
} from "@/lib/ai-companion";
import { STICKER_MAP } from "@/lib/ai-stickers";
import { formatDurationArabic } from "@/lib/video-helper";

export const maxDuration = 60;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const context = await getStudentLearningContext(userId);
    if (!context) {
      return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
    }

    let rawMessages = await prisma.aiChatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 60,
    });

    // رسالة ترحيب استباقية مشفرة عند أول دخول أو تذكير لطيف عند وجود محاضرات منسية
    const now = Date.now();
    const lastMsg = rawMessages[rawMessages.length - 1];
    const hoursSinceLastMsg = lastMsg
      ? (now - new Date(lastMsg.createdAt).getTime()) / (1000 * 60 * 60)
      : 999;

    const pendingTotal =
      context.unwatchedLectures.length + context.unfinishedLectures.length;

    if (rawMessages.length === 0) {
      const firstName =
        context.user.preferredNickname || extractFirstName(context.user.name);
      let welcome = `أهلاً يا ${firstName} 👋 أنا بشمهندس زين زميلك في الكلية، إيه الدنيا؟`;

      if (pendingTotal > 0) {
        const firstUnwatched = context.unwatchedLectures[0];
        const firstUnfinished = context.unfinishedLectures[0];
        if (firstUnwatched) {
          welcome += ` على فكرة نزلت محاضرة "${firstUnwatched.lessonTitle}" في ${firstUnwatched.subjectName} لما تبقى فاضي.`;
        } else if (firstUnfinished) {
          const min = Math.max(1, Math.floor(firstUnfinished.lastPositionSeconds / 60));
          welcome += ` لسه باقيلك تكمل "${firstUnfinished.videoTitle}" (دقيقة ${min}).`;
        }
      }

      const createdWelcome = await prisma.aiChatMessage.create({
        data: {
          userId,
          role: "ASSISTANT",
          channel: "WEB",
          encryptedContent: encodeChatPayload(userId, {
            text: welcome,
            sticker: null,
          }),
        },
      });
      rawMessages = [createdWelcome];
    } else if (pendingTotal > 0 && hoursSinceLastMsg >= 12) {
      const firstName =
        context.user.preferredNickname || extractFirstName(context.user.name);
      const reminderLines = [`👋 إيه يا ${firstName} غبت فين! بقولك، في محاضرات مستنياك على المنصة:`];
      if (context.unwatchedLectures[0]) {
        reminderLines.push(
          `🆕 ${context.unwatchedLectures[0].subjectName}: ${context.unwatchedLectures[0].lessonTitle}`
        );
      }
      if (context.unfinishedLectures[0]) {
        const min = Math.max(1, Math.floor(context.unfinishedLectures[0].lastPositionSeconds / 60));
        reminderLines.push(
          `⏸️ لسه مكمّلتش "${context.unfinishedLectures[0].videoTitle}" (الدقيقة ${min})`
        );
      }
      reminderLines.push(`تحب ننجزها سوا ولا أبعتهالك على رقمك؟`);

      const proactive = await prisma.aiChatMessage.create({
        data: {
          userId,
          role: "ASSISTANT",
          channel: "WEB",
          encryptedContent: encodeChatPayload(userId, {
            text: reminderLines.join("\n"),
            sticker: "coffee_grind",
          }),
        },
      });
      rawMessages = [...rawMessages, proactive];
    }

    const rawSecrets = await prisma.aiPrivateSecret.findMany({
      where: { userId, category: { not: "ABUSE_WARN" } },
      orderBy: { createdAt: "desc" },
    });

    const phoneLogs = await prisma.notification.findMany({
      where: {
        userId,
        type: { in: ["AI_LECTURE_REMINDER", "AI_NEW_LECTURE"] },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    return NextResponse.json({
      context,
      messages: rawMessages.map((m) => {
        const decoded = decodeChatPayload(userId, m.encryptedContent);
        return {
          id: m.id,
          role: m.role,
          channel: m.channel,
          content: decoded.text,
          sticker: decoded.sticker || null,
          imageDataUrl: decoded.imageDataUrl || null,
          imageUrl: decoded.imageUrl || null,
          aiReaction: decoded.aiReaction || null,
          userReaction: decoded.userReaction || null,
          createdAt: m.createdAt,
        };
      }),
      secrets: rawSecrets.map((s) => ({
        id: s.id,
        title: decryptForUser(userId, s.encryptedTitle),
        content: decryptForUser(userId, s.encryptedContent),
        category: s.category,
        createdAt: s.createdAt,
      })),
      phoneLogs,
    });
  } catch (error) {
    console.error("AI Companion GET Error:", error);
    return NextResponse.json({ error: "فشل تحميل المساعد الذكي" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "CHAT") {
      const messageText = String(body.message || "").trim();
      const rawSticker = typeof body.sticker === "string" ? body.sticker.trim() : "";
      const userSticker = STICKER_MAP.has(rawSticker) ? rawSticker : null;
      const rawImageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl.trim() : "";
      const validImageDataUrl =
        /^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(rawImageDataUrl) &&
        rawImageDataUrl.length <= 2_500_000
          ? rawImageDataUrl
          : null;

      if (rawImageDataUrl && !validImageDataUrl) {
        return NextResponse.json(
          { error: "صيغة الصورة غير مدعومة أو حجمها كبير جداً" },
          { status: 400 }
        );
      }

      if (!messageText && !userSticker && !validImageDataUrl) {
        return NextResponse.json({ error: "اكتب رسالة أو ارفع صورة أو اختر استيكر" }, { status: 400 });
      }

      const context = await getStudentLearningContext(userId);
      if (!context) {
        return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
      }

      // حفظ رسالة الطالب مشفرة بالكامل
      let userMsgRecord = await prisma.aiChatMessage.create({
        data: {
          userId,
          role: "USER",
          channel: "WEB",
          encryptedContent: encodeChatPayload(userId, {
            text: messageText,
            sticker: userSticker,
            imageDataUrl: validImageDataUrl,
          }),
        },
      });

      const [rawSecrets, rawHistory] = await Promise.all([
        prisma.aiPrivateSecret.findMany({
          where: { userId, category: { not: "ABUSE_WARN" } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.aiChatMessage.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 12,
        }),
      ]);

      const decryptedSecrets = rawSecrets.map((s) => ({
        id: s.id,
        title: decryptForUser(userId, s.encryptedTitle),
        content: decryptForUser(userId, s.encryptedContent),
        category: s.category,
        createdAt: s.createdAt,
      }));

      const recentMessages = rawHistory
        .reverse()
        .map((m) => {
          const decoded = decodeChatPayload(userId, m.encryptedContent);
          return {
            role: m.role,
            content:
              decoded.text ||
              (decoded.imageDataUrl
                ? "[أرسل صورة سؤال]"
                : decoded.sticker
                ? `[استيكر: ${decoded.sticker}]`
                : ""),
          };
        });

      const ipAddress =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "unknown";
      const userAgent = req.headers.get("user-agent") || "web-chat";

      const result = await generateAiCompanionReply({
        userId,
        userMessage: messageText,
        userSticker,
        imageDataUrl: validImageDataUrl,
        ipAddress,
        userAgent,
        context,
        decryptedSecrets,
        recentMessages,
      });

      if (result.reactToUser) {
        userMsgRecord = await prisma.aiChatMessage.update({
          where: { id: userMsgRecord.id },
          data: {
            encryptedContent: encodeChatPayload(userId, {
              text: messageText,
              sticker: userSticker,
              imageDataUrl: validImageDataUrl,
              aiReaction: result.reactToUser,
            }),
          },
        });
      }

      const assistantMsgRecord = await prisma.aiChatMessage.create({
        data: {
          userId,
          role: "ASSISTANT",
          channel: "WEB",
          encryptedContent: encodeChatPayload(userId, {
            text: result.reply,
            sticker: result.sticker || null,
            imageUrl: result.imageUrl || null,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        userMessage: {
          id: userMsgRecord.id,
          role: "USER",
          channel: "WEB",
          content: messageText,
          sticker: userSticker,
          imageDataUrl: validImageDataUrl,
          aiReaction: result.reactToUser || null,
          userReaction: null,
          createdAt: userMsgRecord.createdAt,
        },
        assistantMessage: {
          id: assistantMsgRecord.id,
          role: "ASSISTANT",
          channel: "WEB",
          content: result.reply,
          sticker: result.sticker || null,
          imageUrl: result.imageUrl || null,
          aiReaction: null,
          userReaction: null,
          createdAt: assistantMsgRecord.createdAt,
        },
        savedSecret: result.savedSecret || null,
        savedNickname: result.savedNickname || null,
        phoneDispatch: result.phoneDispatch || null,
      });
    }

    if (action === "REACT") {
      const messageId = String(body.messageId || "");
      const emoji = typeof body.emoji === "string" ? body.emoji.trim() : "";

      if (!messageId) {
        return NextResponse.json({ error: "معرف الرسالة مطلوب" }, { status: 400 });
      }

      const existingMsg = await prisma.aiChatMessage.findFirst({
        where: { id: messageId, userId },
      });
      if (!existingMsg) {
        return NextResponse.json({ error: "الرسالة غير موجودة" }, { status: 404 });
      }

      const decoded = decodeChatPayload(userId, existingMsg.encryptedContent);
      const nextUserReaction = decoded.userReaction === emoji || !emoji ? null : emoji;

      await prisma.aiChatMessage.update({
        where: { id: existingMsg.id },
        data: {
          encryptedContent: encodeChatPayload(userId, {
            ...decoded,
            userReaction: nextUserReaction,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        messageId: existingMsg.id,
        userReaction: nextUserReaction,
      });
    }

    if (action === "ADD_SECRET") {
      const title = String(body.title || "").trim();
      const content = String(body.content || "").trim();
      const category = String(body.category || "SECRET");

      if (!content) {
        return NextResponse.json({ error: "اكتب محتوى السر أو الملاحظة أولاً" }, { status: 400 });
      }

      const finalTitle = title || (content.length > 32 ? content.slice(0, 32) + "..." : content);
      const created = await prisma.aiPrivateSecret.create({
        data: {
          userId,
          encryptedTitle: encryptForUser(userId, finalTitle),
          encryptedContent: encryptForUser(userId, content),
          category: ["SECRET", "GOAL", "NOTE"].includes(category) ? category : "SECRET",
        },
      });

      return NextResponse.json({
        success: true,
        secret: {
          id: created.id,
          title: finalTitle,
          content,
          category: created.category,
          createdAt: created.createdAt,
        },
      });
    }

    if (action === "DELETE_SECRET") {
      const secretId = String(body.secretId || "");
      await prisma.aiPrivateSecret.deleteMany({
        where: { id: secretId, userId, category: { not: "ABUSE_WARN" } },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "CLEAR_CHAT") {
      await prisma.aiChatMessage.deleteMany({
        where: { userId },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "TOGGLE_PHONE_REMINDERS") {
      const enabled = Boolean(body.enabled);
      await prisma.user.update({
        where: { id: userId },
        data: { aiWhatsappReminders: enabled },
      });
      return NextResponse.json({ success: true, aiWhatsappReminders: enabled });
    }

    if (action === "SEND_PHONE_REMINDER") {
      const res = await sendPhoneReminderToStudent(userId, body.customMessage);
      if (!res.phone) {
        return NextResponse.json(
          { error: "لا يوجد رقم هاتف مسجل بحسابك، يرجى إضافته أولاً." },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        ...res,
      });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error) {
    console.error("AI Companion POST Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء معالجة طلبك" }, { status: 500 });
  }
}
