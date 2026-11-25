import prisma from "./prisma";
import { encryptForUser, decryptForUser } from "./ai-crypto";
import { sendWhatsAppMessage, formatEgyptianPhone } from "./whatsapp";
import { formatDurationArabic } from "./video-helper";

export interface LectureReminderItem {
  subjectId: string;
  subjectName: string;
  lessonId: string;
  lessonTitle: string;
  videoId: string;
  videoTitle: string;
  durationSeconds: number;
  lastPositionSeconds: number;
  lessonCreatedAt: Date;
  status: "UNWATCHED" | "UNFINISHED";
}

export interface ExamReminderItem {
  examId: string;
  subjectId: string;
  subjectName: string;
  title: string;
  windowEndTime: Date;
}

export interface StudentLearningContext {
  user: {
    id: string;
    name: string;
    phone: string | null;
    role: string;
    department: string | null;
    academicLevelName: string | null;
    aiWhatsappReminders: boolean;
    lastAiReminderAt: Date | null;
  };
  enrolledSubjectsCount: number;
  unwatchedLectures: LectureReminderItem[];
  unfinishedLectures: LectureReminderItem[];
  pendingExams: ExamReminderItem[];
}

export async function getStudentLearningContext(userId: string): Promise<StudentLearningContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      academicLevel: true,
      purchases: {
        where: { status: "COMPLETED" },
        select: { subjectId: true },
      },
      videoProgress: true,
      examAttempts: {
        where: { status: { in: ["SUBMITTED", "TIMED_OUT"] } },
        select: { examId: true },
      },
    },
  });

  if (!user) return null;

  const purchasedIds = user.purchases.map((p) => p.subjectId);
  const progressMap = new Map(user.videoProgress.map((vp) => [vp.videoId, vp]));
  const completedExamIds = new Set(user.examAttempts.map((a) => a.examId));
  const now = new Date();

  const subjects =
    purchasedIds.length > 0
      ? await prisma.subject.findMany({
          where: { id: { in: purchasedIds }, isActive: true },
          include: {
            lessons: {
              where: {
                isPublished: true,
                OR: [{ publishAt: null }, { publishAt: { lte: now } }],
              },
              orderBy: { createdAt: "desc" },
              include: {
                videos: { orderBy: { order: "asc" } },
              },
            },
            exams: {
              where: {
                isPublished: true,
                windowStartTime: { lte: now },
                windowEndTime: { gte: now },
              },
            },
          },
        })
      : [];

  const unwatchedLectures: LectureReminderItem[] = [];
  const unfinishedLectures: LectureReminderItem[] = [];
  const pendingExams: ExamReminderItem[] = [];

  for (const subject of subjects) {
    for (const lesson of subject.lessons) {
      for (const video of lesson.videos) {
        const prog = progressMap.get(video.id);
        if (!prog || (prog.lastPositionSeconds === 0 && !prog.isCompleted)) {
          unwatchedLectures.push({
            subjectId: subject.id,
            subjectName: subject.name,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            videoId: video.id,
            videoTitle: video.title,
            durationSeconds: video.durationSeconds,
            lastPositionSeconds: 0,
            lessonCreatedAt: lesson.createdAt,
            status: "UNWATCHED",
          });
        } else if (!prog.isCompleted) {
          unfinishedLectures.push({
            subjectId: subject.id,
            subjectName: subject.name,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            videoId: video.id,
            videoTitle: video.title,
            durationSeconds: video.durationSeconds,
            lastPositionSeconds: prog.lastPositionSeconds,
            lessonCreatedAt: lesson.createdAt,
            status: "UNFINISHED",
          });
        }
      }
    }

    for (const exam of subject.exams) {
      if (!completedExamIds.has(exam.id)) {
        pendingExams.push({
          examId: exam.id,
          subjectId: subject.id,
          subjectName: subject.name,
          title: exam.title,
          windowEndTime: exam.windowEndTime,
        });
      }
    }
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      department: user.department,
      academicLevelName: user.academicLevel?.name || null,
      aiWhatsappReminders: user.aiWhatsappReminders,
      lastAiReminderAt: user.lastAiReminderAt,
    },
    enrolledSubjectsCount: subjects.length,
    unwatchedLectures,
    unfinishedLectures,
    pendingExams,
  };
}

export function buildPhoneReminderMessage(context: StudentLearningContext): string {
  const firstName = context.user.name?.split(" ")[0] || "يا هندسة";
  const lines: string[] = [
    `أهلاً يا ${firstName} 👋🤖 أنا رفيقك الذكي على منصة هندسة!`,
  ];

  if (context.unwatchedLectures.length > 0) {
    lines.push("");
    lines.push(`🆕 *محاضرات جديدة لسه مسمعتهاش (${context.unwatchedLectures.length}):*`);
    for (const item of context.unwatchedLectures.slice(0, 3)) {
      lines.push(`• *${item.subjectName}* — ${item.lessonTitle} (${formatDurationArabic(item.durationSeconds)})`);
    }
  }

  if (context.unfinishedLectures.length > 0) {
    lines.push("");
    lines.push(`⏸️ *محاضرات بدأتها ونسيت تكملها (${context.unfinishedLectures.length}):*`);
    for (const item of context.unfinishedLectures.slice(0, 3)) {
      const stoppedMin = Math.max(1, Math.floor(item.lastPositionSeconds / 60));
      lines.push(`• *${item.subjectName}* — ${item.videoTitle} (وقفت عند الدقيقة ${stoppedMin})`);
    }
  }

  if (context.pendingExams.length > 0) {
    lines.push("");
    lines.push(`📝 *امتحانات مفتوحة متاحة الآن:*`);
    for (const exam of context.pendingExams.slice(0, 2)) {
      lines.push(`• ${exam.title} (${exam.subjectName})`);
    }
  }

  if (
    context.unwatchedLectures.length === 0 &&
    context.unfinishedLectures.length === 0 &&
    context.pendingExams.length === 0
  ) {
    lines.push("");
    lines.push("🎉 ما شاء الله عليك! مفيش عليك أي محاضرات متأخرة دلوقتي. لو احتجت تدردش أو تذاكر، أنا مستنيك على المنصة في أي وقت!");
  } else {
    lines.push("");
    lines.push("💡 ابدأ ولو بـ 15 دقيقة دلوقتي من هنا: https://eng-academy-eg.vercel.app/student/courses");
  }

  return lines.join("\n");
}

export async function sendPhoneReminderToStudent(
  userId: string,
  customMessage?: string
): Promise<{
  sent: boolean;
  phone: string | null;
  messageText: string;
  waDirectUrl: string | null;
}> {
  const context = await getStudentLearningContext(userId);
  if (!context || !context.user.phone) {
    return {
      sent: false,
      phone: null,
      messageText: "",
      waDirectUrl: null,
    };
  }

  const messageText = customMessage || buildPhoneReminderMessage(context);
  const delivered = await sendWhatsAppMessage(context.user.phone, messageText);

  await prisma.notification.create({
    data: {
      userId,
      channel: "WHATSAPP",
      type: "AI_LECTURE_REMINDER",
      title: "رسالة من رفيقك الذكي",
      body: messageText,
      status: delivered ? "SENT" : "FAILED",
      sentAt: delivered ? new Date() : null,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { lastAiReminderAt: new Date() },
  });

  await prisma.aiChatMessage.create({
    data: {
      userId,
      role: "ASSISTANT",
      channel: "WHATSAPP",
      encryptedContent: encryptForUser(
        userId,
        `📱 بعتلك رسالة تذكير على رقمك الخاص (${context.user.phone}):\n\n${messageText}`
      ),
    },
  });

  const waPhone = formatEgyptianPhone(context.user.phone);
  return {
    sent: delivered,
    phone: context.user.phone,
    messageText,
    waDirectUrl: `https://wa.me/${waPhone}?text=${encodeURIComponent(messageText)}`,
  };
}

/**
 * إرسال إشعار فوري من الرفيق الذكي لكل طلاب المادة عند نزول محاضرة أو فيديو جديد
 */
export async function notifyStudentsOfNewLecture(params: {
  subjectId: string;
  lessonTitle: string;
  videoTitle?: string;
  durationSeconds?: number;
}) {
  try {
    const subject = await prisma.subject.findUnique({
      where: { id: params.subjectId },
      select: { name: true },
    });
    if (!subject) return;

    const purchases = await prisma.purchase.findMany({
      where: {
        subjectId: params.subjectId,
        status: "COMPLETED",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            aiWhatsappReminders: true,
          },
        },
      },
    });

    for (const purchase of purchases) {
      const student = purchase.user;
      if (!student || student.status !== "ACTIVE") continue;

      const firstName = student.name?.split(" ")[0] || "يا هندسة";
      const durationNote = params.durationSeconds
        ? ` (${formatDurationArabic(params.durationSeconds)})`
        : "";
      const videoPart = params.videoTitle ? ` — فيديو: *${params.videoTitle}*${durationNote}` : "";

      const msg = `أهلاً يا ${firstName} 👋🤖\nحبيت أفكرك إن نزل محاضرة جديدة دلوقتي في مادة *${subject.name}*:\n📚 *${params.lessonTitle}*${videoPart}\n\nلو فاضي ادخل اسمعها، ولو نسيت هفكرك تاني! 🚀\nhttps://eng-academy-eg.vercel.app/student/courses/${params.subjectId}`;

      // حفظ تذكير استباقي مشفر داخل شات الطالب مع رفيقه الذكي
      await prisma.aiChatMessage.create({
        data: {
          userId: student.id,
          role: "ASSISTANT",
          channel: "WEB",
          encryptedContent: encryptForUser(
            student.id,
            `🔔 تنبيه جديد: نزلتلك محاضرة جديدة في مادة "${subject.name}" بعنوان "${params.lessonTitle}"${
              params.videoTitle ? ` (${params.videoTitle})` : ""
            }. لما تكون جاهز قولي نراجعها مع بعض!`
          ),
        },
      });

      if (student.aiWhatsappReminders && student.phone) {
        const ok = await sendWhatsAppMessage(student.phone, msg);
        await prisma.notification.create({
          data: {
            userId: student.id,
            channel: "WHATSAPP",
            type: "AI_NEW_LECTURE",
            title: `محاضرة جديدة في ${subject.name}`,
            body: msg,
            status: ok ? "SENT" : "FAILED",
            sentAt: ok ? new Date() : null,
          },
        });
      }
    }
  } catch (err) {
    console.error("notifyStudentsOfNewLecture Error:", err);
  }
}

function normalizeArabic(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();
}

export async function generateAiCompanionReply(params: {
  userId: string;
  userMessage: string;
  context: StudentLearningContext;
  decryptedSecrets: { id: string; title: string; content: string; category: string; createdAt: Date }[];
  recentMessages: { role: string; content: string }[];
}): Promise<{
  reply: string;
  savedSecret?: { id: string; title: string; content: string };
  phoneDispatch?: { sent: boolean; phone: string | null; waDirectUrl: string | null };
}> {
  const { userId, userMessage, context, decryptedSecrets, recentMessages } = params;
  const norm = normalizeArabic(userMessage);
  const firstName = context.user.name?.split(" ")[0] || "يا هندسة";

  // 1. فحص رغبة الطالب في حفظ سر شخصي داخل الخزنة المشفرة
  const secretTriggers = [
    "احفظ سر",
    "احفظلي سر",
    "سري",
    "عايز اقولك سر",
    "هقولك سر",
    "متقولش لحد",
    "خلي بالك من سر",
    "خزنه",
    "سر:",
    "خبي",
  ];
  const wantsToSaveSecret = secretTriggers.some((k) => norm.includes(k));

  let savedSecret: { id: string; title: string; content: string } | undefined;
  if (wantsToSaveSecret && userMessage.trim().length > 6) {
    const cleanedSecret = userMessage
      .replace(/^(احفظ سر|احفظلي سر|عايز أقولك سر|عايز اقولك سر|هقولك سر|سر:|خبي)[:\s-]*/i, "")
      .trim() || userMessage.trim();
    const shortTitle =
      cleanedSecret.length > 36 ? cleanedSecret.slice(0, 36) + "..." : cleanedSecret;

    const created = await prisma.aiPrivateSecret.create({
      data: {
        userId,
        encryptedTitle: encryptForUser(userId, shortTitle),
        encryptedContent: encryptForUser(userId, cleanedSecret),
        category: "SECRET",
      },
    });
    savedSecret = { id: created.id, title: shortTitle, content: cleanedSecret };
  }

  // 2. فحص طلب الإرسال إلى رقم الهاتف الخاص عبر الواتساب
  const phoneTriggers = [
    "ابعتلي علي رقمي",
    "ابعت علي رقمي",
    "ابعتلي علي الواتس",
    "ابعتلي واتس",
    "فكرني علي رقمي",
    "ذكرني علي رقمي",
    "رساله علي رقمي",
    "ابعتلي رساله",
    "موبايلي",
    "واتساب",
  ];
  const wantsPhoneReminder = phoneTriggers.some((k) => norm.includes(k));

  let phoneDispatch: { sent: boolean; phone: string | null; waDirectUrl: string | null } | undefined;
  if (wantsPhoneReminder) {
    const res = await sendPhoneReminderToStudent(userId);
    phoneDispatch = {
      sent: res.sent,
      phone: res.phone,
      waDirectUrl: res.waDirectUrl,
    };
  }

  // 3. استدعاء نموذج الذكاء الاصطناعي الخارجي إن كان مفعّلاً في البيئة (Gemini أو OpenAI)
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  const lectureSummaryText = [
    `المواد المشترك بها الطالب: ${context.enrolledSubjectsCount}`,
    `محاضرات جديدة لم يسمعها بعد (${context.unwatchedLectures.length}): ${
      context.unwatchedLectures
        .slice(0, 5)
        .map((l) => `${l.subjectName} - ${l.lessonTitle} (${formatDurationArabic(l.durationSeconds)})`)
        .join(" | ") || "لا يوجد"
    }`,
    `محاضرات بدأها ونسي يكملها (${context.unfinishedLectures.length}): ${
      context.unfinishedLectures
        .slice(0, 5)
        .map(
          (l) =>
            `${l.subjectName} - ${l.videoTitle} (توقف عند الدقيقة ${Math.max(
              1,
              Math.floor(l.lastPositionSeconds / 60)
            )})`
        )
        .join(" | ") || "لا يوجد"
    }`,
    `امتحانات متاحة الآن (${context.pendingExams.length}): ${
      context.pendingExams.map((e) => `${e.title} (${e.subjectName})`).join(" | ") || "لا يوجد"
    }`,
  ].join("\n");

  const secretsSummaryText =
    decryptedSecrets.length > 0
      ? decryptedSecrets.slice(0, 10).map((s, i) => `${i + 1}. ${s.content}`).join("\n")
      : "لا توجد أسرار محفوظة بعد.";

  const systemInstruction = `أنت "رفيقك الذكي" — مساعد ذكاء اصطناعي شخصي وودود لطلاب كلية الهندسة داخل منصة هندسة التعليمية.
تتحدث باللهجة المصرية الدافئة والمحترمة والعملية.
اسم الطالب: ${context.user.name}، الفرقة: ${context.user.academicLevelName || "غير محددة"}، القسم: ${context.user.department || "عام"}، رقم هاتفه الخاص: ${context.user.phone || "غير مسجل"}.

قواعد الخصوصية المطلقة:
- كل ما يحكيه الطالب لك من أسرار ومشاعر مشفر بتقنية AES-256-GCM خاصة به وحده ولا يطلع عليه أي شخص آخر ولا الإدارة.
- كن كاتم أسرار أمين وصبور ومشجع.

حالة محاضرات الطالب الحالية:
${lectureSummaryText}

الأسرار والمذكرات الخاصة المحفوظة لهذا الطالب (سرية للغاية):
${secretsSummaryText}
${savedSecret ? `\n[ملاحظة نظام: تم للتو حفظ سر الطالب الجديد "${savedSecret.title}" في خزنته المشفرة.]` : ""}
${
  phoneDispatch
    ? phoneDispatch.phone
      ? `\n[ملاحظة نظام: تم للتو إرسال تذكير بالمحاضرات على رقم هاتف الطالب (${phoneDispatch.phone}) عبر الواتساب.]`
      : `\n[ملاحظة نظام: الطالب ليس لديه رقم هاتف مسجل، أخبره بإضافته من صفحة الحساب.]`
    : ""
}

قم بالرد على رسالة الطالب بشكل طبيعي، ذكي، مختصر ومفيد، وذكّره برفق لو لديه محاضرات جديدة أو لم يكملها.`;

  if (geminiKey) {
    try {
      const contents = [
        ...recentMessages.slice(-8).map((m) => ({
          role: m.role === "ASSISTANT" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        { role: "user", parts: [{ text: userMessage }] },
      ];

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: { temperature: 0.75, maxOutputTokens: 700 },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return { reply: text.trim(), savedSecret, phoneDispatch };
        }
      }
    } catch (err) {
      console.error("Gemini Companion Error:", err);
    }
  }

  if (openAiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemInstruction },
            ...recentMessages.slice(-8).map((m) => ({
              role: m.role === "ASSISTANT" ? "assistant" : "user",
              content: m.content,
            })),
            { role: "user", content: userMessage },
          ],
          temperature: 0.75,
          max_tokens: 700,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) {
          return { reply: text.trim(), savedSecret, phoneDispatch };
        }
      }
    } catch (err) {
      console.error("OpenAI Companion Error:", err);
    }
  }

  // 4. المحرك الذكي المدمج باللهجة المصرية (يعمل فوراً بدون أي مفاتيح خارجية)
  if (savedSecret) {
    return {
      reply: `🔒 سرك في أمان تام يا ${firstName}!\n\nتم حفظ رسالتك في **خزنتك السرية المشفرة (AES-256)**، ومفيش أي حد يقدر يقرأها غيرك إنت وبس (حتى الإدارة).\n\nلو حابب تفضفض أكتر أو تحط هدف جديد ليك أنا سامعك دايماً. 💙`,
      savedSecret,
      phoneDispatch,
    };
  }

  if (wantsPhoneReminder && phoneDispatch) {
    if (!phoneDispatch.phone) {
      return {
        reply: `يا ${firstName}، محتاجين تسجل رقم موبايلك في صفحة الحساب الأول عشان أقدر أبعتلك رسايل التذكير على الواتساب الخاص بيك!`,
        phoneDispatch,
      };
    }
    return {
      reply: `📱 تم تجهيز وإرسال التذكير لرقمك الخاص **${phoneDispatch.phone}**!\n\nتقدر كمان تفتحه مباشرة على الواتساب من الزرار اللي تحت الرسالة، وهيفضل التذكير التلقائي شغال عشان أفكرك أول ما تنزل محاضرة جديدة أو لو نسيت تكمل حصة. ✅`,
      phoneDispatch,
    };
  }

  const wantsRecallSecrets = ["اسراري", "الاسرار", "فاكر ايه", "قلتلك ايه", "خزنتي"].some((k) =>
    norm.includes(k)
  );
  if (wantsRecallSecrets) {
    if (decryptedSecrets.length === 0) {
      return {
        reply: `خزنتك السرية لسه فاضية يا ${firstName} 🔒\n\nلو في أي سر، هدف شخصي، أو حاجة مضايقاك ومش عايز حد يعرفها، اكتبلي مثلاً: **"احفظ سر: ..."** أو استخدم تبويب **"خزنة أسراري 🔒"** وهحتفظ بيها مشفرة ليك لوحدك.`,
      };
    }
    const list = decryptedSecrets
      .slice(0, 6)
      .map((s, i) => `${i + 1}. 🔐 ${s.content}`)
      .join("\n");
    return {
      reply: `دي أسرارك ومذكراتك المحفوظة بينا (محدش شايفها غيرك يا ${firstName}):\n\n${list}\n\nتقدر تحذف أو تعدل أي سر منهم في أي وقت من خزنة أسرارك.`,
    };
  }

  const wantsLectures = [
    "محاضر",
    "نسيت",
    "فكرني",
    "ذكرني",
    "ايه الجديد",
    "جديد",
    "نزل",
    "مذاكر",
    "ابدا",
    "اسمع",
    "فاضل",
    "كورس",
  ].some((k) => norm.includes(k));

  if (wantsLectures) {
    if (
      context.unwatchedLectures.length === 0 &&
      context.unfinishedLectures.length === 0 &&
      context.pendingExams.length === 0
    ) {
      if (context.enrolledSubjectsCount === 0) {
        return {
          reply: `أهلاً يا ${firstName}! 👋\nلسه مفيش كورسات مفعلة على حسابك دلوقتي. أول ما يتفعل لك كورس، هتابعلك كل المحاضرات اللي بتنزل وأفكرك بيها أول بأول هنا وعلى رقمك الخاص (${
            context.user.phone || "رقمك المسجل"
          })!`,
        };
      }
      return {
        reply: `عاش يا ${firstName}! 🔥\nمفيش عليك أي محاضرات متأخرة ولا حصص نسيت تكملها حالياً. استمر على التركيز ده! تحب نبعت ملخص تشجيعي على رقمك أو نحدد هدف للأسبوع الجاي؟`,
      };
    }

    const parts: string[] = [`خليني أفكرك بوضع محاضراتك دلوقتي يا ${firstName} 📚:`];
    if (context.unwatchedLectures.length > 0) {
      parts.push(`\n🆕 **محاضرات جديدة لسه مسمعتهاش (${context.unwatchedLectures.length}):**`);
      for (const l of context.unwatchedLectures.slice(0, 4)) {
        parts.push(`• **${l.subjectName}** — ${l.lessonTitle} (${formatDurationArabic(l.durationSeconds)})`);
      }
    }
    if (context.unfinishedLectures.length > 0) {
      parts.push(`\n⏸️ **محاضرات بدأتها ونسيت تكملها (${context.unfinishedLectures.length}):**`);
      for (const l of context.unfinishedLectures.slice(0, 4)) {
        const min = Math.max(1, Math.floor(l.lastPositionSeconds / 60));
        parts.push(`• **${l.subjectName}** — ${l.videoTitle} (وقفت عند الدقيقة **${min}**)`);
      }
    }
    if (context.pendingExams.length > 0) {
      parts.push(`\n📝 **امتحانات متاحة ليك الآن:**`);
      for (const e of context.pendingExams.slice(0, 2)) {
        parts.push(`• ${e.title} (${e.subjectName})`);
      }
    }
    parts.push(`\nلو تحب أبعتلك التذكير ده على رقمك الخاص (**${context.user.phone || "واتساب"}**) اكتبلي **"ابعتلي على رقمي"** أو اضغط زرار التذكير فوق! 📱`);

    return { reply: parts.join("\n") };
  }

  const isStressed = ["مضغوط", "تعبان", "زهق", "خايف", "صعب", "مخنوق", "فاشل", "تايه", "مش قادر"].some((k) =>
    norm.includes(k)
  );
  if (isStressed) {
    const nextHint =
      context.unfinishedLectures[0]
        ? `ابدأ بس بـ 10 دقايق تكمل فيها محاضرة "${context.unfinishedLectures[0].videoTitle}" من المكان اللي وقفت عنده.`
        : context.unwatchedLectures[0]
        ? `ابدأ بس بأول 10 دقايق من محاضرة "${context.unwatchedLectures[0].lessonTitle}".`
        : "خد نفس عميق وقسم مذاكرتك لفقرات صغيرة 25 دقيقة وراحة 5 دقايق.";

    return {
      reply: `يا ${firstName}، طبيعي جداً تمر بلحظات ضغط في هندسة — المهم إنك متشيلش الهم لوحدك 💙\n\nلو في حاجة مضايقاك وعايز تحفظها كسر بيني وبينك اكتبلي **"احفظ سر: ..."** ومحدش في الكون هيشوفها.\n\nوبالنسبة للمذاكرة: ${nextHint} خطوة صغيرة كل يوم بتفرق جامد، وأنا جنبك أفكرك بالراحة. 💪`,
    };
  }

  const isGreeting = ["السلام", "اهلا", "ازيك", "عامل ايه", "هاي", "hello", "hi", "صباح", "مساء"].some((k) =>
    norm.includes(k)
  );
  if (isGreeting) {
    const pendingCount = context.unwatchedLectures.length + context.unfinishedLectures.length;
    const reminderNote =
      pendingCount > 0
        ? `\n\n📌 على فكرة، لسه في **${pendingCount}** محاضرة مستنياك (${
            context.unwatchedLectures.length
          } جديدة و${context.unfinishedLectures.length} مكمّلتهاش). تحب أفكرك بتفاصيلهم أو أبعتلك رسالة على رقمك الخاص؟`
        : "\n\nأنا هنا دايماً أسمعك، أحفظ أسرارك بتشفير خاص بيك لوحدك 🔒، وأفكرك بمواعيد محاضراتك أول بأول على المنصة وعلى رقمك الشخصي.";

    return {
      reply: `أهلاً بيك يا بشمهندس ${firstName}! 👋✨ منور منصتك.${reminderNote}`,
    };
  }

  // رد ذكي عام متفاعل مع سياق الطالب
  const pendingTotal = context.unwatchedLectures.length + context.unfinishedLectures.length;
  return {
    reply: `فاهمك يا ${firstName} 👍\nأنا رفيقك الذكي هنا في المنصة — تقدر:\n1. تحكيلي أي **سر أو هدف شخصي** (اكتب *"احفظ سر: ..."*) وهيفضل مشفر ليك وحدك ومحدش غيرك يطلع عليه أبداً 🔒.\n2. تسألني في أي وقت **"عندي محاضرات إيه؟"** عشان أفكرك بالمحاضرات الجديدة واللي نسيت تكملها${
      pendingTotal > 0 ? ` (عندك حالياً **${pendingTotal}** محاضرة منتظراك!)` : ""
    }.\n3. تقولي **"ابعتلي على رقمي"** عشان أوصلك بالواتساب على رقمك الشخصي (${
      context.user.phone || "المسجل بحسابك"
    }) وأفكرك دايماً. 📱`,
  };
}
