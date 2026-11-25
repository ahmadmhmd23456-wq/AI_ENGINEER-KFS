import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { encryptForUser, decryptForUser } from "@/lib/ai-crypto";
import {
  getStudentLearningContext,
  generateAiCompanionReply,
  sendPhoneReminderToStudent,
} from "@/lib/ai-companion";
import { formatDurationArabic } from "@/lib/video-helper";

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
      const firstName = context.user.name?.split(" ")[0] || "يا هندسة";
      let welcome = `أهلاً بك يا ${firstName} 👋🤖 أنا **رفيقك الذكي** داخل منصة هندسة.\n\n🔒 كل كلامك وأسرارك معايا مشفرة بتشفير خاص بيك لوحدك (**AES-256**)، ومفيش أي شخص غيرك يقدر يطلع عليها حتى إدارة المنصة.\n📱 كمان هفكرك أول بأول لو في محاضرة نزلت أو نسيت تكمل حصة برسائل على رقمك الخاص (**${
        context.user.phone || "المسجل بحسابك"
      }**).`;

      if (pendingTotal > 0) {
        const firstUnwatched = context.unwatchedLectures[0];
        const firstUnfinished = context.unfinishedLectures[0];
        welcome += `\n\n📌 **تذكير سريع حالياً:**\n`;
        if (firstUnwatched) {
          welcome += `• محاضرة جديدة لم تشاهدها: **${firstUnwatched.subjectName}** — ${firstUnwatched.lessonTitle} (${formatDurationArabic(
            firstUnwatched.durationSeconds
          )})\n`;
        }
        if (firstUnfinished) {
          const min = Math.max(1, Math.floor(firstUnfinished.lastPositionSeconds / 60));
          welcome += `• محاضرة نسيت تكملها: **${firstUnfinished.subjectName}** — ${firstUnfinished.videoTitle} (وقفت عند الدقيقة ${min})\n`;
        }
      }

      const createdWelcome = await prisma.aiChatMessage.create({
        data: {
          userId,
          role: "ASSISTANT",
          channel: "WEB",
          encryptedContent: encryptForUser(userId, welcome),
        },
      });
      rawMessages = [createdWelcome];
    } else if (pendingTotal > 0 && hoursSinceLastMsg >= 12) {
      const firstName = context.user.name?.split(" ")[0] || "يا هندسة";
      const reminderLines = [`👋 وحشتنا يا ${firstName}! حبيت أفكرك بالمحاضرات اللي مستنياك:`];
      if (context.unwatchedLectures[0]) {
        reminderLines.push(
          `🆕 ${context.unwatchedLectures[0].subjectName}: ${context.unwatchedLectures[0].lessonTitle}`
        );
      }
      if (context.unfinishedLectures[0]) {
        const min = Math.max(1, Math.floor(context.unfinishedLectures[0].lastPositionSeconds / 60));
        reminderLines.push(
          `⏸️ لسه مكمّلتش "${context.unfinishedLectures[0].videoTitle}" (وقفت عند الدقيقة ${min})`
        );
      }
      reminderLines.push(`تحب أبدأ معاك ولا أبعتلك التذكير على رقمك؟`);

      const proactive = await prisma.aiChatMessage.create({
        data: {
          userId,
          role: "ASSISTANT",
          channel: "WEB",
          encryptedContent: encryptForUser(userId, reminderLines.join("\n")),
        },
      });
      rawMessages = [...rawMessages, proactive];
    }

    const rawSecrets = await prisma.aiPrivateSecret.findMany({
      where: { userId },
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
      messages: rawMessages.map((m) => ({
        id: m.id,
        role: m.role,
        channel: m.channel,
        content: decryptForUser(userId, m.encryptedContent),
        createdAt: m.createdAt,
      })),
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
      if (!messageText) {
        return NextResponse.json({ error: "الرسالة فارغة" }, { status: 400 });
      }

      const context = await getStudentLearningContext(userId);
      if (!context) {
        return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
      }

      // حفظ رسالة الطالب مشفرة بالكامل
      const userMsgRecord = await prisma.aiChatMessage.create({
        data: {
          userId,
          role: "USER",
          channel: "WEB",
          encryptedContent: encryptForUser(userId, messageText),
        },
      });

      const [rawSecrets, rawHistory] = await Promise.all([
        prisma.aiPrivateSecret.findMany({
          where: { userId },
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
        .map((m) => ({
          role: m.role,
          content: decryptForUser(userId, m.encryptedContent),
        }));

      const result = await generateAiCompanionReply({
        userId,
        userMessage: messageText,
        context,
        decryptedSecrets,
        recentMessages,
      });

      const assistantMsgRecord = await prisma.aiChatMessage.create({
        data: {
          userId,
          role: "ASSISTANT",
          channel: "WEB",
          encryptedContent: encryptForUser(userId, result.reply),
        },
      });

      return NextResponse.json({
        success: true,
        userMessage: {
          id: userMsgRecord.id,
          role: "USER",
          channel: "WEB",
          content: messageText,
          createdAt: userMsgRecord.createdAt,
        },
        assistantMessage: {
          id: assistantMsgRecord.id,
          role: "ASSISTANT",
          channel: "WEB",
          content: result.reply,
          createdAt: assistantMsgRecord.createdAt,
        },
        savedSecret: result.savedSecret || null,
        phoneDispatch: result.phoneDispatch || null,
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
        where: { id: secretId, userId },
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
