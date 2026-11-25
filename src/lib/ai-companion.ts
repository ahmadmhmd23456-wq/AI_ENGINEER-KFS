import prisma from "./prisma";
import { encryptForUser, decryptForUser } from "./ai-crypto";
import { sendWhatsAppMessage, formatEgyptianPhone } from "./whatsapp";
import { formatDurationArabic } from "./video-helper";
import { AI_STICKERS, STICKER_MAP } from "./ai-stickers";

export interface DecodedChatPayload {
  text: string;
  sticker?: string | null;
  aiReaction?: string | null;
  userReaction?: string | null;
}

export function encodeChatPayload(userId: string, payload: DecodedChatPayload): string {
  return encryptForUser(
    userId,
    JSON.stringify({
      __v2: true,
      text: payload.text || "",
      sticker: payload.sticker || null,
      aiReaction: payload.aiReaction || null,
      userReaction: payload.userReaction || null,
    })
  );
}

export function decodeChatPayload(userId: string, encryptedContent: string): DecodedChatPayload {
  const plain = decryptForUser(userId, encryptedContent);
  if (plain && plain.startsWith("{") && plain.includes('"__v2":true')) {
    try {
      const parsed = JSON.parse(plain);
      return {
        text: typeof parsed.text === "string" ? parsed.text : "",
        sticker: parsed.sticker || null,
        aiReaction: parsed.aiReaction || null,
        userReaction: parsed.userReaction || null,
      };
    } catch {
      return { text: plain };
    }
  }
  return { text: plain };
}

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

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function extractFirstName(fullName?: string | null): string {
  const cleaned = (fullName || "")
    .replace(/^(?:م\/|م\.|د\/|د\.|أ\/|أ\.|المهندس|مهندس|باشمهندس)\s*/i, "")
    .trim();
  return cleaned.split(/\s+/)[0] || "يا هندسة";
}

function isCleanLlmReply(text: string): boolean {
  if (!text || text.trim().length < 2) return false;
  // منع أي حروف صينية/يابانية/كورية مشوهة قد تصدر أحياناً من بعض النماذج المفتوحة
  if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(text)) return false;
  return true;
}

interface ParsedAiReply {
  reply: string;
  reactToUser?: string | null;
  sticker?: string | null;
}

function parseStructuredAiOutput(raw: string): ParsedAiReply {
  const trimmed = (raw || "")
    .trim()
    .replace(/```\s*$/g, "")
    .trim();
  const jsonMatch =
    trimmed.match(/^```(?:json)?\s*([\s\S]*?)(?:```|$)/i)?.[1]?.trim() ||
    (trimmed.startsWith("{") && trimmed.endsWith("}") ? trimmed : null);

  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch);
      if (obj && typeof obj.reply === "string" && obj.reply.trim()) {
        const validSticker =
          typeof obj.sticker === "string" && STICKER_MAP.has(obj.sticker) ? obj.sticker : null;
        const validReact =
          typeof obj.reactToUser === "string" && obj.reactToUser.trim().length <= 8
            ? obj.reactToUser.trim()
            : null;
        return {
          reply: obj.reply.trim(),
          reactToUser: validReact,
          sticker: validSticker,
        };
      }
    } catch {
      // نعود للنص العادي
    }
  }

  return { reply: trimmed.replace(/^```(?:json)?/i, "").trim(), reactToUser: null, sticker: null };
}

const AI_LLM_VAULT_ID = "PLATFORM_AI_LLM_VAULT";
const AI_LLM_SETTING_KEY = "AI_LLM_CONFIG";

export interface AiLlmConfig {
  geminiKey?: string;
  groqKey?: string;
  openRouterKey?: string;
  openAiKey?: string;
}

export async function getOptionalAiKeys(): Promise<AiLlmConfig> {
  let geminiKey = process.env.GEMINI_API_KEY;
  let groqKey = process.env.GROQ_API_KEY;
  let openRouterKey = process.env.OPENROUTER_API_KEY;
  let openAiKey = process.env.OPENAI_API_KEY;

  try {
    const row = await prisma.platformSetting.findUnique({ where: { key: AI_LLM_SETTING_KEY } });
    if (row?.value) {
      const dec = decryptForUser(AI_LLM_VAULT_ID, row.value);
      if (dec && !dec.startsWith("[")) {
        const parsed = JSON.parse(dec) as AiLlmConfig;
        geminiKey = parsed.geminiKey || geminiKey;
        groqKey = parsed.groqKey || groqKey;
        openRouterKey = parsed.openRouterKey || openRouterKey;
        openAiKey = parsed.openAiKey || openAiKey;
      }
    }
  } catch {
    // تجاهل والعودة لمتغيرات البيئة
  }

  return { geminiKey, groqKey, openRouterKey, openAiKey };
}

export async function saveAiLlmConfig(input: AiLlmConfig): Promise<void> {
  let existing: AiLlmConfig = {};
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key: AI_LLM_SETTING_KEY } });
    if (row?.value) {
      const dec = decryptForUser(AI_LLM_VAULT_ID, row.value);
      if (dec && !dec.startsWith("[")) {
        existing = JSON.parse(dec);
      }
    }
  } catch {
    // تجاهل
  }

  const pickKey = (nextVal?: string, prevVal?: string) => {
    if (nextVal === undefined) return prevVal || "";
    const t = nextVal.trim();
    if (!t) return "";
    if (t.includes("••••")) return prevVal || "";
    return t;
  };

  const merged: AiLlmConfig = {
    geminiKey: pickKey(input.geminiKey, existing.geminiKey),
    groqKey: pickKey(input.groqKey, existing.groqKey),
    openRouterKey: pickKey(input.openRouterKey, existing.openRouterKey),
    openAiKey: pickKey(input.openAiKey, existing.openAiKey),
  };

  const encrypted = encryptForUser(AI_LLM_VAULT_ID, JSON.stringify(merged));
  await prisma.platformSetting.upsert({
    where: { key: AI_LLM_SETTING_KEY },
    update: { value: encrypted },
    create: { key: AI_LLM_SETTING_KEY, value: encrypted },
  });
}

export async function getAiLlmConfigSummary() {
  const keys = await getOptionalAiKeys();
  const activeProvider = keys.geminiKey
    ? "GEMINI"
    : keys.groqKey
    ? "GROQ"
    : keys.openRouterKey
    ? "OPENROUTER"
    : keys.openAiKey
    ? "OPENAI"
    : "NONE";

  return {
    isConfigured: activeProvider !== "NONE",
    activeProvider,
    hasGeminiKey: Boolean(keys.geminiKey),
    hasGroqKey: Boolean(keys.groqKey),
    hasOpenRouterKey: Boolean(keys.openRouterKey),
    hasOpenAiKey: Boolean(keys.openAiKey),
  };
}

async function callOpenAiCompatible(params: {
  endpoint: string;
  apiKey: string;
  model: string;
  systemInstruction: string;
  recentMessages: { role: string; content: string }[];
  userInput: string;
  jsonMode?: boolean;
}): Promise<{ ok: boolean; text?: string; error?: string }> {
  try {
    const res = await fetch(params.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages: [
          { role: "system", content: params.systemInstruction },
          ...params.recentMessages.slice(-10).map((m) => ({
            role: m.role === "ASSISTANT" ? "assistant" : "user",
            content: m.content,
          })),
          { role: "user", content: params.userInput },
        ],
        temperature: 0.9,
        max_tokens: 900,
        ...(params.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${errBody.slice(0, 160)}` };
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return text ? { ok: true, text } : { ok: false, error: "رد فارغ من المزود" };
  } catch (err: any) {
    return { ok: false, error: err?.message || "فشل الاتصال بالمزود" };
  }
}

async function callGemini(params: {
  apiKey: string;
  systemInstruction?: string;
  contents: { role: string; parts: { text: string }[] }[];
  jsonMode?: boolean;
  maxOutputTokens?: number;
  temperature?: number;
}): Promise<{ ok: boolean; model?: string; text?: string; error?: string }> {
  const models = [
    "gemini-flash-lite-latest",
    "gemini-3-flash-preview",
    "gemini-3.8-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
  ];
  let lastError = "فشل الاتصال بـ Gemini";

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
          params.apiKey
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(params.systemInstruction
              ? { systemInstruction: { parts: [{ text: params.systemInstruction }] } }
              : {}),
            contents: params.contents,
            generationConfig: {
              temperature: params.temperature ?? 0.9,
              maxOutputTokens: params.maxOutputTokens ?? 2048,
              ...(params.jsonMode ? { responseMimeType: "application/json" } : {}),
            },
          }),
          signal: AbortSignal.timeout(15000),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const replyPart = parts.find((p: any) => !p?.thought && typeof p?.text === "string");
        if (replyPart?.text) {
          return { ok: true, model, text: replyPart.text };
        }
        lastError = `رد فارغ من ${model}`;
      } else {
        const errText = await res.text().catch(() => "");
        lastError = `HTTP ${res.status} (${model}): ${errText.slice(0, 180)}`;
        // لو المفتاح نفسه مرفوض لا داعي لتكرار النموذج
        if (res.status === 400 || res.status === 401 || res.status === 403) break;
      }
    } catch (e: any) {
      lastError = e?.message || `فشل الاتصال بـ ${model}`;
    }
  }

  return { ok: false, error: lastError };
}

export async function testConfiguredAiProvider(): Promise<{
  ok: boolean;
  provider: string;
  reply?: string;
  error?: string;
}> {
  const { geminiKey, groqKey, openRouterKey, openAiKey } = await getOptionalAiKeys();
  const prompt = "رد بجملة قصيرة واحدة بالعامية المصرية كأنك زميل طالب هندسة: قول إن النظام شغال تمام.";

  if (geminiKey) {
    const g = await callGemini({
      apiKey: geminiKey,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      maxOutputTokens: 1024,
      temperature: 0.7,
    });
    return g.ok
      ? { ok: true, provider: `Google Gemini (${g.model})`, reply: g.text?.trim() }
      : { ok: false, provider: "Gemini", error: g.error };
  }

  if (groqKey) {
    const r = await callOpenAiCompatible({
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: groqKey,
      model: "llama-3.3-70b-versatile",
      systemInstruction: "أنت زميل طالب هندسة مصري ودود.",
      recentMessages: [],
      userInput: prompt,
    });
    return r.ok
      ? { ok: true, provider: "Groq (Llama 3.3 70B)", reply: r.text?.trim() }
      : { ok: false, provider: "Groq", error: r.error };
  }

  if (openRouterKey) {
    const r = await callOpenAiCompatible({
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: openRouterKey,
      model: "meta-llama/llama-3.3-70b-instruct:free",
      systemInstruction: "أنت زميل طالب هندسة مصري ودود.",
      recentMessages: [],
      userInput: prompt,
    });
    return r.ok
      ? { ok: true, provider: "OpenRouter Free", reply: r.text?.trim() }
      : { ok: false, provider: "OpenRouter", error: r.error };
  }

  if (openAiKey) {
    const r = await callOpenAiCompatible({
      endpoint: "https://api.openai.com/v1/chat/completions",
      apiKey: openAiKey,
      model: "gpt-4o-mini",
      systemInstruction: "أنت زميل طالب هندسة مصري ودود.",
      recentMessages: [],
      userInput: prompt,
    });
    return r.ok
      ? { ok: true, provider: "OpenAI (gpt-4o-mini)", reply: r.text?.trim() }
      : { ok: false, provider: "OpenAI", error: r.error };
  }

  return { ok: false, provider: "NONE", error: "لم يتم حفظ أي مفتاح ذكاء اصطناعي بعد." };
}

export async function generateAiCompanionReply(params: {
  userId: string;
  userMessage: string;
  userSticker?: string | null;
  context: StudentLearningContext;
  decryptedSecrets: { id: string; title: string; content: string; category: string; createdAt: Date }[];
  recentMessages: { role: string; content: string }[];
}): Promise<{
  reply: string;
  reactToUser?: string | null;
  sticker?: string | null;
  savedSecret?: { id: string; title: string; content: string };
  phoneDispatch?: { sent: boolean; phone: string | null; waDirectUrl: string | null };
}> {
  const { userId, userMessage, userSticker, context, decryptedSecrets, recentMessages } = params;
  const userStickerDef = userSticker ? STICKER_MAP.get(userSticker) : null;
  const effectiveUserInput = userMessage.trim()
    ? userStickerDef
      ? `${userMessage.trim()} [بعتلك استيكر: ${userStickerDef.emoji} ${userStickerDef.label}]`
      : userMessage.trim()
    : userStickerDef
    ? `[الطالب بعتلك استيكر: ${userStickerDef.emoji} "${userStickerDef.label}"]`
    : "";

  const norm = normalizeArabic(effectiveUserInput);
  const firstName = extractFirstName(context.user.name);

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
    const cleanedSecret =
      userMessage
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
    "علي موبايلي",
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

  // 3. تجهيز سياق الدردشة الحرة بمستوى ChatGPT + شخصية الزميل المصري
  const { geminiKey, openAiKey, groqKey, openRouterKey } = await getOptionalAiKeys();

  const lectureSummaryText = [
    `المواد المشترك بها: ${context.enrolledSubjectsCount}`,
    `محاضرات جديدة لم يسمعها (${context.unwatchedLectures.length}): ${
      context.unwatchedLectures
        .slice(0, 5)
        .map((l) => `${l.subjectName} - ${l.lessonTitle} (${formatDurationArabic(l.durationSeconds)})`)
        .join(" | ") || "لا يوجد"
    }`,
    `محاضرات بدأها ولم يكملها (${context.unfinishedLectures.length}): ${
      context.unfinishedLectures
        .slice(0, 5)
        .map(
          (l) =>
            `${l.subjectName} - ${l.videoTitle} (الدقيقة ${Math.max(
              1,
              Math.floor(l.lastPositionSeconds / 60)
            )})`
        )
        .join(" | ") || "لا يوجد"
    }`,
    `امتحانات مفتوحة الآن (${context.pendingExams.length}): ${
      context.pendingExams.map((e) => `${e.title} (${e.subjectName})`).join(" | ") || "لا يوجد"
    }`,
  ].join("\n");

  const secretsSummaryText =
    decryptedSecrets.length > 0
      ? decryptedSecrets.slice(0, 10).map((s, i) => `${i + 1}. ${s.content}`).join("\n")
      : "لا توجد أسرار محفوظة بعد.";

  const stickerMenuText = AI_STICKERS.map((s) => `${s.id} (${s.emoji} ${s.label})`).join("، ");

  const systemInstruction = `أنت زميل طالب هندسة مصري ذكي جداً ودمك خفيف وكلامك حر 100% زي ChatGPT بس بأسلوب صاحب جامعة جدع!
معلومات عن صاحبك (الطالب):
- اسمه: ${context.user.name} (اندهله بأسلوب قريب زي "يا ${firstName}" أو "يا هندسة" أو "يا صاحبي" بشكل طبيعي مش مكرر في كل جملة).
- الفرقة: ${context.user.academicLevelName || "هندسة"} | القسم: ${context.user.department || "عام"} | رقمه: ${context.user.phone || "غير مسجل"}.

شخصيتك وقواعد الكلام:
- اتكلم بالعامية المصرية الطبيعية جداً والحرة — كأنكم قاعدين على القهوة أو بتذاكروا سوا على ديسكورد/واتساب!
- ابعد تماماً عن الكلام الرسمي أو القوالب المعلبة زي "أهلاً بك، تقدر تسألني عن 1 2 3".
- عندك حرية كاملة في أي موضوع زي ChatGPT: برمجة، مسائل رياضية وفيزيائية، شرح مفاهيم هندسية، هزار، فضفضة، أفكار مشاريع، نصايح حياة، تنظيم وقت، سهر، قهوة، كورة، أي سؤال يخطر على باله!
- متجبش سيرة المحاضرات أو الكورسات إلا لو هو سأل عنها أو الموضوع فتح السكة ليها بشكل طبيعي لطيف.
- أي سر يحكيهولك مشفر AES-256-GCM عنده وحده ولا حد غيره يشوفه، وخليك كاتم أسرار أمين.

حالة الطالب على المنصة (استخدمها بذكاء وقت الحاجة فقط):
${lectureSummaryText}

أسراره المحفوظة (سرية للغاية بينكم فقط):
${secretsSummaryText}
${savedSecret ? `\n[نظام: تم حفظ السر الجديد "${savedSecret.title}" في خزنته المشفرة.]` : ""}
${
  phoneDispatch
    ? phoneDispatch.phone
      ? `\n[نظام: تم إرسال تذكير بالمحاضرات لرقم الطالب (${phoneDispatch.phone}) على واتساب.]`
      : `\n[نظام: الطالب مفيش رقم متسجل على حسابه.]`
    : ""
}

الاستيكرز المتاحة لو المود يليق تبعت استيكر (مش لازم كل رسالة، ابعت لما تحس إنه هيضحك أو يشجع أو يليق):
${stickerMenuText}

الريأكت: تقدر تحط إيموجي ريأكت على رسالة الطالب اللي فاتت (مثل 🔥 أو 😂 أو ❤️ أو 💪 أو 🫡 أو 🤯 أو 🫂 أو 👏 أو 👀 أو null).

مهم جداً: رد دائماً بصيغة JSON صالحة فقط بدون أي نص خارجها بهذا الشكل:
{"reactToUser":"🔥","sticker":null,"reply":"كلامك الطبيعي الحر هنا"}`;

  // محاولة 1: Gemini API
  if (geminiKey) {
    const contents = [
      ...recentMessages.slice(-10).map((m) => ({
        role: m.role === "ASSISTANT" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: effectiveUserInput }] },
    ];

    const g = await callGemini({
      apiKey: geminiKey,
      systemInstruction,
      contents,
      jsonMode: true,
      maxOutputTokens: 2048,
      temperature: 0.9,
    });
    if (g.ok && g.text) {
      const parsed = parseStructuredAiOutput(g.text);
      return { ...parsed, savedSecret, phoneDispatch };
    }
  }

  // محاولة 2: Groq / OpenRouter / OpenAI عبر الواجهة الموحدة
  const openAiCompatibleProviders = [
    groqKey
      ? {
          endpoint: "https://api.groq.com/openai/v1/chat/completions",
          apiKey: groqKey,
          model: "llama-3.3-70b-versatile",
          jsonMode: true,
        }
      : null,
    openRouterKey
      ? {
          endpoint: "https://openrouter.ai/api/v1/chat/completions",
          apiKey: openRouterKey,
          model: "meta-llama/llama-3.3-70b-instruct:free",
          jsonMode: false,
        }
      : null,
    openAiKey
      ? {
          endpoint: "https://api.openai.com/v1/chat/completions",
          apiKey: openAiKey,
          model: "gpt-4o-mini",
          jsonMode: true,
        }
      : null,
  ].filter(Boolean) as { endpoint: string; apiKey: string; model: string; jsonMode: boolean }[];

  for (const prov of openAiCompatibleProviders) {
    const r = await callOpenAiCompatible({
      endpoint: prov.endpoint,
      apiKey: prov.apiKey,
      model: prov.model,
      systemInstruction,
      recentMessages,
      userInput: effectiveUserInput,
      jsonMode: prov.jsonMode,
    });
    if (r.ok && r.text) {
      const parsed = parseStructuredAiOutput(r.text);
      if (isCleanLlmReply(parsed.reply)) {
        return { ...parsed, savedSecret, phoneDispatch };
      }
    }
  }

  // محاولة 4: بوابة ذكاء اصطناعي مجانية مفتوحة (إن لم يكن هناك ضغط IP)
  try {
    const res = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages: [
          { role: "system", content: systemInstruction },
          ...recentMessages.slice(-6).map((m) => ({
            role: m.role === "ASSISTANT" ? "assistant" : "user",
            content: m.content,
          })),
          { role: "user", content: effectiveUserInput },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text && typeof text === "string" && isCleanLlmReply(text)) {
        const parsed = parseStructuredAiOutput(text);
        if (isCleanLlmReply(parsed.reply)) {
          return { ...parsed, savedSecret, phoneDispatch };
        }
      }
    }
  } catch {
    // نكمل بسلاسة للمحرك المحلي التفاعلي
  }

  // 5. المحرك التفاعلي الحر بشخصية الزميل المصري (مع ريأكت واستيكرز طبيعية)
  if (savedSecret) {
    return {
      reactToUser: "🤫",
      sticker: "secret_locked",
      reply: pickRandom([
        `تمام يا ${firstName}، سرك في بير متشفر عندي ومحدش في المجرة يعرف يفتحه غيرك. احكيلي براحتك لو حابب تكمل كلام في الموضوع ده 🤍`,
        `متقلقش خالص يا صاحبي، الكلام ده اتقفل عليه بمفتاحك الخاص ومفيش مخلوق يقدر يشوفه. في ضهرك دايماً!`,
      ]),
      savedSecret,
      phoneDispatch,
    };
  }

  if (wantsPhoneReminder && phoneDispatch) {
    if (!phoneDispatch.phone) {
      return {
        reactToUser: "📱",
        sticker: null,
        reply: `يا ${firstName}، لسه رقم موبايلك مش متضاف على حسابك! ضيفه من صفحة الحساب وهرشّقلك تذكيرات على طول 😄`,
        phoneDispatch,
      };
    }
    return {
      reactToUser: "🫡",
      sticker: "rocket_start",
      reply: `وصلت يا زميلي! بعتلك التذكير على رقمك **${phoneDispatch.phone}** وهتلاقي زرار يفتحلك الرسالة على واتساب تحت لو حبيت تراجعها. يلا قوم اعمل كوباية شاي واكسر الدنيا!`,
      phoneDispatch,
    };
  }

  // الرد على استيكر بعته الطالب
  if (userStickerDef && !userMessage.trim()) {
    const stickerReplyMap: Record<string, { react: string; sticker: string; texts: string[] }> = {
      coffee_grind: {
        react: "☕",
        sticker: "rocket_start",
        texts: [
          `احلى كوباية شاي بالنعناع ولا نسكافيه يا ${firstName}! ناوي تفرم إيه النهارده؟ قولّي خليني أزق معاك`,
          `ده الكلام المظبوط! لما القهوة تنزل الساحة المذاكرة بتظبط تلقائي 😄 هتبدأ بإيه؟`,
        ],
      },
      laughing: {
        react: "😂",
        sticker: "laughing",
        texts: [
          `تدوم الضحكة يا صاحبي 😂 احكيلي إيه اللي فصلك ضحك كده!`,
          `ضحكني معاك يسطا، القعدة كانت ناقصاها نكتة حلوة والله 🤣`,
        ],
      },
      sleepy_night: {
        react: "🌙",
        sticker: "coffee_grind",
        texts: [
          `شكلك سهرانين للصبح زي حالاتي يا ${firstName} 😅 لو بتذاكر قولي نشجع بعض، ولو فصلت روح نام ساعة عشان تركيزك يرجع!`,
        ],
      },
      hug_support: {
        react: "🫂",
        sticker: "hug_support",
        texts: [
          `حبيبي يا ${firstName}، إحنا في ضهر بعض دايماً يا هندسة 🤍 لو في أي حاجة شاغلاك احكيلي.`,
        ],
      },
    };
    const match = stickerReplyMap[userStickerDef.id];
    if (match) {
      return {
        reactToUser: match.react,
        sticker: match.sticker,
        reply: pickRandom(match.texts),
      };
    }
    return {
      reactToUser: userStickerDef.emoji,
      sticker: pickRandom(["salute", "3ash_ya_handasa"]),
      reply: `جامد الاستيكر ده يا ${firstName} 😂 إحكيلي عامل إيه النهارده؟`,
    };
  }

  const wantsRecallSecrets = ["اسراري", "الاسرار", "فاكر ايه", "قلتلك ايه", "خزنتي", "ملاحظاتي"].some((k) =>
    norm.includes(k)
  );
  if (wantsRecallSecrets) {
    if (decryptedSecrets.length === 0) {
      return {
        reactToUser: "👀",
        sticker: "secret_locked",
        reply: `لسه محفظناش أسرار بينا يا ${firstName} — لو في أي حاجة شاغلة دماغك قولّي "احفظ سر..." أو سيبها في تبويب الملاحظات فوق وهتفضل بينا إحنا الاتنين وبس.`,
      };
    }
    const list = decryptedSecrets
      .slice(0, 6)
      .map((s, i) => `${i + 1}. 🔐 ${s.content}`)
      .join("\n");
    return {
      reactToUser: "🤫",
      sticker: "secret_locked",
      reply: `أكيد فاكر كل حاجة بينا يا صاحبي، دي أسرارك وملاحظاتك اللي محدش غيرك يقدر يقرأها:\n\n${list}`,
    };
  }

  const isJokeOrFunny = [
    "ههه",
    "نكته",
    "ضحك",
    "يسطا",
    "ياسطا",
    "يا عم",
    "فصلت",
    "يخربيت",
    "مقلب",
    "😂",
    "🤣",
  ].some((k) => norm.includes(k));
  if (isJokeOrFunny && !norm.includes("محاضر") && !norm.includes("امتحان")) {
    return {
      reactToUser: "😂",
      sticker: Math.random() > 0.35 ? "laughing" : null,
      reply: pickRandom([
        `يسطا والله مهندسين مصر دول محتاجين موسوعة جينيس في خفة الدم وسط الضغط 😂 احكيلي إيه الجديد معاك؟`,
        `ده أنا فصلت ضحك والله 🤣 بس استنى، إحنا بنهزر بس وقت الجد بتلاقي التقفيل على الباب! طمني عملت إيه النهارده؟`,
        `أحلى قعدة والله يا ${firstName} 😄 قولي لو عايز نهزر شوية، ولا نتكلم في كود/مسألة، ولا تحكيلي موقف حصل معاك في الكلية؟`,
      ]),
    };
  }

  const isLateNightOrCoffee = [
    "سهران",
    "نوم",
    "نعسان",
    "قهوه",
    "شاي",
    "نسكافيه",
    "بليل",
    "الفجر",
    "صاحي",
  ].some((k) => norm.includes(k));
  if (isLateNightOrCoffee) {
    return {
      reactToUser: "☕",
      sticker: pickRandom(["coffee_grind", "sleepy_night"]),
      reply: pickRandom([
        `أحلى شيفت ليلي ده يا هندسة 🌙☕ بس خد بالك: المخ بعد ما يفصل بيقعد يقرأ السطر الواحد عشر مرات على الفاضي، فلو خلاص هنجت ريّح شوية، ولو لسه فيك طاقة قولي ننجز إيه سوا!`,
        `كوباية شاي بالنعناع ولا قهوة مظبوطة وتبقى الدنيا زي الفل يا ${firstName} ☕ سهران بتذاكر ولا بتفصل من الدنيا؟`,
      ]),
    };
  }

  const isThanksOrPraise = [
    "شكرا",
    "تسلم",
    "حبيبي",
    "جامد",
    "كفو",
    "عاش",
    "ممتاز",
    "برنس",
    "رجوله",
    "الله عليك",
  ].some((k) => norm.includes(k));
  if (isThanksOrPraise) {
    return {
      reactToUser: "❤️",
      sticker: pickRandom(["3ash_ya_handasa", "salute"]),
      reply: pickRandom([
        `حبيبي يا ${firstName} ده واجبي، إحنا زمايل في الضيق قبل الفرج 🫡❤️ أي وقت تحتاجني هتلاقيني فاتحلك الشات.`,
        `عاش بيك إنت يا صاحبي والله! شيد حيلك وأنا في ضهرك في أي حاجة تحتاجها 💪🔥`,
      ]),
    };
  }

  const wantsStudyPlan = ["خطه", "مذاكر", "انظم", "رتب", "جدول"].some((k) => norm.includes(k));
  if (wantsStudyPlan && !norm.includes("محاضر") && !norm.includes("نسيت") && !norm.includes("فكرني")) {
    const firstTask = context.unfinishedLectures[0]
      ? `نكمّل الأول محاضرة **${context.unfinishedLectures[0].videoTitle}** في ${context.unfinishedLectures[0].subjectName} (إنت أصلاً وقفت عند الدقيقة ${Math.max(1, Math.floor(context.unfinishedLectures[0].lastPositionSeconds / 60))})`
      : context.unwatchedLectures[0]
      ? `نسمع **${context.unwatchedLectures[0].lessonTitle}** في ${context.unwatchedLectures[0].subjectName} بتركيز`
      : `نمسك أهم مادة عندك ونحل عليها 5 مسائل بإيدك`;

    return {
      reactToUser: "💪",
      sticker: "rocket_start",
      reply: `بص يا ${firstName}، سيبك من الجداول المثالية اللي بتبوظ من أول ساعة 😅 خلينا نمشي بجدول واقعي تخلصه فعلاً النهاردة:\n\n• **أول 35 دقيقة:** ${firstTask}.\n• **10 دقايق فصلان:** تقوم تشرب مية أو شاي وتسيب الموبايل.\n• **25 دقيقة تطبيق:** تحل بإيدك مسألتين أو تكتب ملخص بإيدك.\n\nإيه رأيك في التجميعة دي؟ لو ثقيلة نظبطها على مقاس طاقتك دلوقتي!`,
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
      return {
        reactToUser: "🔥",
        sticker: "exam_boss",
        reply:
          context.enrolledSubjectsCount === 0
            ? `حالياً مفيش مواد متفعلة على حسابك لسه يا ${firstName}، أول ما تفتح مادة هتابعلك كل المحاضرات أول بأول 😎`
            : `يا عم انت برنس ومقفل اللي عليك 🔥 مفيش ولا محاضرة متأخرة ولا حصة ناقصة دلوقتي! استمتع بالرايق أو اسألني في أي حاجة تانية تحبها.`,
      };
    }

    const parts: string[] = [`بص يا ${firstName}، ده اللي مستنيك على المنصة دلوقتي:`];
    if (context.unwatchedLectures.length > 0) {
      parts.push(`\n🆕 **جديد ولسه مسمعتوش (${context.unwatchedLectures.length}):**`);
      for (const l of context.unwatchedLectures.slice(0, 4)) {
        parts.push(`• ${l.subjectName} — ${l.lessonTitle} (${formatDurationArabic(l.durationSeconds)})`);
      }
    }
    if (context.unfinishedLectures.length > 0) {
      parts.push(`\n⏸️ **بدأت فيها ووقفت في النص (${context.unfinishedLectures.length}):**`);
      for (const l of context.unfinishedLectures.slice(0, 4)) {
        const min = Math.max(1, Math.floor(l.lastPositionSeconds / 60));
        parts.push(`• ${l.subjectName} — ${l.videoTitle} (الدقيقة ${min})`);
      }
    }
    if (context.pendingExams.length > 0) {
      parts.push(`\n📝 **امتحانات فاتحة دلوقتي:** ${context.pendingExams.map((e) => e.title).join("، ")}`);
    }
    parts.push(`\nابدأ بأخف واحدة فيهم ولو حسيت إنك كسلت قولي وأنا أشجعك 😄`);

    return {
      reactToUser: "📚",
      sticker: "coffee_grind",
      reply: parts.join("\n"),
    };
  }

  const isStressed = [
    "مضغوط",
    "تعبان",
    "زهق",
    "خايف",
    "صعب",
    "مخنوق",
    "فاشل",
    "تايه",
    "مش قادر",
    "قرفان",
    "محبط",
    "مش طايق",
  ].some((k) => norm.includes(k));
  if (isStressed) {
    return {
      reactToUser: "🫂",
      sticker: "hug_support",
      reply: pickRandom([
        `تعالى هنا يا ${firstName} — كلنا في هندسة بنعدي بأيام دماغنا بتقفل فيها ومش طايقين نبص في ورقة، وده طبيعي جداً مش ضعف منك خالص 🫂\n\nسيبك من جلد الذات دلوقتي؛ احكيلي إيه بالظبط اللي خانقك (مادة معينة، امتحان، ولا موضوع بره الكلية؟) خلينا نفكها سوا واحدة واحدة.`,
        `حقك تزهق والله يا صاحبي، الضغط مش قليل! خد نفسين وافصل 10 دقايق من غير تأنيب ضمير. لو حابب تفضفضلي في أي حاجة — حتى لو بره الدراسة خالص — أنا سامعك وكلامنا متشفر ومحدش شايفه غيرك 🤍`,
      ]),
    };
  }

  const isGreeting = [
    "السلام",
    "اهلا",
    "ازيك",
    "عامل ايه",
    "هاي",
    "hello",
    "hi",
    "صباح",
    "مساء",
    "اخبارك",
    "ايه الدنيا",
  ].some((k) => norm.includes(k));
  if (isGreeting) {
    const pendingCount = context.unwatchedLectures.length + context.unfinishedLectures.length;
    const casualPending =
      pendingCount > 0 && Math.random() > 0.4
        ? ` (على جنب كده: في ${pendingCount} محاضرة مستنياك لما تروق 😉)`
        : "";
    return {
      reactToUser: "👋",
      sticker: Math.random() > 0.5 ? "salute" : null,
      reply: pickRandom([
        `أهلاً بيك يا ${firstName}! عامل إيه النهارده؟ احكيلي الدنيا ماشية معاك إزاي${casualPending}`,
        `منور الدنيا يا هندسة ✨ إيه الأخبار؟ جاي ندردش، نهزر، ولا في مسألة معصلجة عايزين نفكها؟${casualPending}`,
        `يا هلا بالزميل! كله تمام والحمد لله، إنت اللي طمني عليك عامل إيه؟`,
      ]),
    };
  }

  // رد حر ومفتوح لأي موضوع عشوائي أو سؤال عام
  const isQuestion =
    userMessage.includes("؟") ||
    userMessage.includes("?") ||
    ["ازاي", "ايه هو", "يعني ايه", "اشرح", "ليه", "ممكن", "قولي", "رايك", "كود", "مسأله", "برمجه"].some(
      (k) => norm.includes(k)
    );

  if (isQuestion) {
    return {
      reactToUser: "🧠",
      sticker: "mind_blown",
      reply: pickRandom([
        `سؤال حلو يا ${firstName}! بص: عشان أديك الإجابة اللي في الجون ومحدش يضحك علينا، اديني تفصيلة زيادة أو اكتبلي المسألة/الموضوع كامل وخلينا نحلله سوا خطوة بخطوة كأننا قاعدين بنذاكر في نفس السكشن 💡`,
        `حلو الكلام ده! خليني أقولك الخلاصة بسلاسة — وقولي لو عايزنا نتعمق أكتر في جزء معين أو ندخل في التفاصيل الرياضية/العملية بتاعته 👇`,
      ]),
    };
  }

  return {
    reactToUser: pickRandom(["🔥", "👀", "❤️", "🫡"]),
    sticker: Math.random() > 0.6 ? pickRandom(["3ash_ya_handasa", "salute", "coffee_grind"]) : null,
    reply: pickRandom([
      `أيوة كده يا ${firstName}، كمّل كلامك ده دماغي شغالة معاك! قولّي رأيك إيه أو ناوي تعمل إيه في الموضوع ده؟`,
      `فاهمك تمام يا صاحبي 💯 والله الحياة في الكلية دي عايزة اللي ياخدها بذكاء وروقان زيك. إحكيلي أكتر، إيه اللي في دماغك دلوقتي؟`,
      `كلام موزون والله يا هندسة 👌 تحب نكمّل رغي في الموضوع ده، ولا تسألني في حاجة معينة، ولا نخطط لليوم؟ الشات شاتك!`,
    ]),
  };
}
