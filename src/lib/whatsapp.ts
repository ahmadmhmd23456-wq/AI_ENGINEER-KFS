import prisma from "./prisma";
import { encryptForUser, decryptForUser } from "./ai-crypto";

const PLATFORM_SETTINGS_VAULT_ID = "PLATFORM_WHATSAPP_CONFIG_VAULT";
const WHATSAPP_SETTING_KEY = "WHATSAPP_CONFIG";

export type WhatsAppProviderType = "META" | "ULTRAMSG" | "CUSTOM";

export interface WhatsAppConfig {
  provider: WhatsAppProviderType;
  senderPhone?: string;
  metaPhoneNumberId?: string;
  metaAccessToken?: string;
  ultramsgInstanceId?: string;
  ultramsgToken?: string;
  customApiUrl?: string;
  customApiToken?: string;
}

/**
 * تنسيق رقم الهاتف المصري إلى الصيغة الدولية لـ WhatsApp (201xxxxxxxxx)
 */
export function formatEgyptianPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("01")) {
    cleaned = "2" + cleaned;
  } else if (!cleaned.startsWith("201") && cleaned.startsWith("1")) {
    cleaned = "20" + cleaned;
  }
  return cleaned;
}

function isPlaceholder(val?: string | null): boolean {
  if (!val) return true;
  const trimmed = val.trim();
  return (
    !trimmed ||
    trimmed.includes("your-") ||
    trimmed.includes("demo") ||
    trimmed === '""'
  );
}

export async function getActiveWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  try {
    const row = await prisma.platformSetting.findUnique({
      where: { key: WHATSAPP_SETTING_KEY },
    });
    if (row?.value) {
      const decrypted = decryptForUser(PLATFORM_SETTINGS_VAULT_ID, row.value);
      if (decrypted && !decrypted.startsWith("[")) {
        const parsed = JSON.parse(decrypted) as WhatsAppConfig;
        if (parsed && parsed.provider) return parsed;
      }
    }
  } catch {
    // في حال تعذر قراءة الإعدادات نعود لمتغيرات البيئة
  }

  const metaId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const metaToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!isPlaceholder(metaId) && !isPlaceholder(metaToken)) {
    return {
      provider: "META",
      metaPhoneNumberId: metaId,
      metaAccessToken: metaToken,
    };
  }

  const ultraId = process.env.ULTRAMSG_INSTANCE_ID;
  const ultraToken = process.env.ULTRAMSG_TOKEN;
  if (!isPlaceholder(ultraId) && !isPlaceholder(ultraToken)) {
    return {
      provider: "ULTRAMSG",
      ultramsgInstanceId: ultraId,
      ultramsgToken: ultraToken,
    };
  }

  return null;
}

export async function saveWhatsAppConfig(config: WhatsAppConfig): Promise<void> {
  const existing = await getActiveWhatsAppConfig();

  // الحفاظ على التوكن السابق إذا لم يكتب الأدمن توكناً جديداً أثناء التحديث
  const merged: WhatsAppConfig = {
    provider: config.provider,
    senderPhone: config.senderPhone?.trim() || existing?.senderPhone || "",
    metaPhoneNumberId: config.metaPhoneNumberId?.trim() || existing?.metaPhoneNumberId || "",
    metaAccessToken:
      config.metaAccessToken && !config.metaAccessToken.includes("••••")
        ? config.metaAccessToken.trim()
        : existing?.metaAccessToken || "",
    ultramsgInstanceId: config.ultramsgInstanceId?.trim() || existing?.ultramsgInstanceId || "",
    ultramsgToken:
      config.ultramsgToken && !config.ultramsgToken.includes("••••")
        ? config.ultramsgToken.trim()
        : existing?.ultramsgToken || "",
    customApiUrl: config.customApiUrl?.trim() || existing?.customApiUrl || "",
    customApiToken:
      config.customApiToken && !config.customApiToken.includes("••••")
        ? config.customApiToken.trim()
        : existing?.customApiToken || "",
  };

  const encrypted = encryptForUser(PLATFORM_SETTINGS_VAULT_ID, JSON.stringify(merged));

  await prisma.platformSetting.upsert({
    where: { key: WHATSAPP_SETTING_KEY },
    update: { value: encrypted },
    create: { key: WHATSAPP_SETTING_KEY, value: encrypted },
  });
}

export async function getWhatsAppConfigSummary() {
  const cfg = await getActiveWhatsAppConfig();
  if (!cfg) {
    return {
      isConnected: false,
      provider: "NONE",
      senderPhone: "",
      metaPhoneNumberId: "",
      hasMetaToken: false,
      ultramsgInstanceId: "",
      hasUltramsgToken: false,
      customApiUrl: "",
      hasCustomToken: false,
    };
  }

  const isConnected =
    (cfg.provider === "META" && Boolean(cfg.metaPhoneNumberId && cfg.metaAccessToken)) ||
    (cfg.provider === "ULTRAMSG" && Boolean(cfg.ultramsgInstanceId && cfg.ultramsgToken)) ||
    (cfg.provider === "CUSTOM" && Boolean(cfg.customApiUrl));

  return {
    isConnected,
    provider: cfg.provider,
    senderPhone: cfg.senderPhone || "",
    metaPhoneNumberId: cfg.metaPhoneNumberId || "",
    hasMetaToken: Boolean(cfg.metaAccessToken),
    ultramsgInstanceId: cfg.ultramsgInstanceId || "",
    hasUltramsgToken: Boolean(cfg.ultramsgToken),
    customApiUrl: cfg.customApiUrl || "",
    hasCustomToken: Boolean(cfg.customApiToken),
  };
}

export async function sendWhatsAppDetailed(
  toPhone: string,
  bodyText: string
): Promise<{ ok: boolean; simulated?: boolean; error?: string; provider?: string }> {
  const formattedPhone = formatEgyptianPhone(toPhone);
  const cfg = await getActiveWhatsAppConfig();

  if (!cfg) {
    console.warn(`[WhatsApp Sim] إلى: ${formattedPhone} | نص الرسالة:\n${bodyText}`);
    return { ok: true, simulated: true, provider: "SIMULATION" };
  }

  try {
    if (cfg.provider === "ULTRAMSG") {
      if (!cfg.ultramsgInstanceId || !cfg.ultramsgToken) {
        return { ok: false, error: "بيانات UltraMsg غير مكتملة", provider: "ULTRAMSG" };
      }
      const instance = cfg.ultramsgInstanceId.replace(/[^a-zA-Z0-9_-]/g, "");
      const url = `https://api.ultramsg.com/${instance}/messages/chat`;
      const params = new URLSearchParams();
      params.append("token", cfg.ultramsgToken);
      params.append("to", `+${formattedPhone}`);
      params.append("body", bodyText);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error) {
        console.error("UltraMsg API Error:", data);
        return {
          ok: false,
          error: data?.error?.message || data?.error || "فشل الإرسال عبر UltraMsg",
          provider: "ULTRAMSG",
        };
      }
      return { ok: true, simulated: false, provider: "ULTRAMSG" };
    }

    if (cfg.provider === "CUSTOM") {
      if (!cfg.customApiUrl) {
        return { ok: false, error: "رابط API المخصص غير موجود", provider: "CUSTOM" };
      }
      const response = await fetch(cfg.customApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cfg.customApiToken ? { Authorization: `Bearer ${cfg.customApiToken}` } : {}),
        },
        body: JSON.stringify({
          to: formattedPhone,
          phone: formattedPhone,
          text: bodyText,
          message: bodyText,
          body: bodyText,
        }),
      });
      if (!response.ok) {
        const errTxt = await response.text().catch(() => "");
        return { ok: false, error: errTxt || "فشل الإرسال عبر البوابة المخصصة", provider: "CUSTOM" };
      }
      return { ok: true, simulated: false, provider: "CUSTOM" };
    }

    // META Cloud API الرسمي
    if (!cfg.metaPhoneNumberId || !cfg.metaAccessToken) {
      return { ok: false, error: "بيانات Meta Cloud API غير مكتملة", provider: "META" };
    }
    const url = `https://graph.facebook.com/v21.0/${cfg.metaPhoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.metaAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: { preview_url: true, body: bodyText },
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Meta WhatsApp API Error:", data);
      return {
        ok: false,
        error: data?.error?.message || "فشل الإرسال عبر Meta WhatsApp API",
        provider: "META",
      };
    }

    return { ok: true, simulated: false, provider: "META" };
  } catch (error: any) {
    console.error("خطأ أثناء إرسال رسالة الواتساب:", error);
    return { ok: false, error: error?.message || "خطأ اتصال ببوابة الواتساب" };
  }
}

/**
 * إرسال رسالة واتساب عبر المزود المُفعّل للمنصة
 */
export async function sendWhatsAppMessage(toPhone: string, bodyText: string): Promise<boolean> {
  const res = await sendWhatsAppDetailed(toPhone, bodyText);
  return res.ok;
}

/**
 * إرسال تنبيه أمني عاجل للأدمن (المدرس)
 */
export async function sendWhatsAppAlertToAdmin(adminPhone: string, alertText: string): Promise<boolean> {
  return sendWhatsAppMessage(adminPhone, alertText);
}

/**
 * إرسال كود الـ OTP للتحقق من رقم هاتف الطالب
 */
export async function sendOtpWhatsApp(phone: string, code: string): Promise<boolean> {
  const msg = `كود التحقق الخاص بك لمنصة هندسة التعليمية هو: *${code}*
صالح لمدة 10 دقائق. برجاء عدم مشاركة الكود مع أي شخص.`;
  return sendWhatsAppMessage(phone, msg);
}

/**
 * إرسال نتيجة امتحان للطالب عبر الواتساب فور التسليم
 */
export async function sendExamResultWhatsApp(params: {
  phone: string;
  studentName: string;
  examTitle: string;
  score: number;
  totalMarks: number;
}) {
  const { phone, studentName, examTitle, score, totalMarks } = params;
  const percentage = Math.round((score / totalMarks) * 100);
  const statusEmoji = percentage >= 50 ? "🎉 ممتاز!" : "⚠️ فرصة للتحسين";

  const msg = `مرحباً يا هندسة ${studentName} 👋
${statusEmoji} نتيجتك في *${examTitle}*:
📊 الدرجة: *${score} من ${totalMarks}* (${percentage}%)
نتمنى لك دوام التفوق والنجاح! 🚀`;

  return sendWhatsAppMessage(phone, msg);
}

/**
 * إرسال إشعار تأكيد الدفع وفتح المادة
 */
export async function sendPaymentSuccessWhatsApp(params: {
  phone: string;
  studentName: string;
  subjectName: string;
  amount: number;
}) {
  const { phone, studentName, subjectName, amount } = params;
  const msg = `أهلاً يا بشمهندس ${studentName} 👋
تم تأكيد اشتراكك بنجاح في مادة:
📘 *${subjectName}*
💰 القيمة: ${amount} جنيه مصري
تم فتح المحاضرات والملفات والامتحانات على حسابك فوراً! بالتوفيق. ✨`;

  return sendWhatsAppMessage(phone, msg);
}
