import prisma from "./prisma";

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

/**
 * إرسال رسالة واتساب عبر Meta Cloud API الرسمي
 */
export async function sendWhatsAppMessage(toPhone: string, bodyText: string): Promise<boolean> {
  const formattedPhone = formatEgyptianPhone(toPhone);
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn(`[WhatsApp Sim] إلى: ${formattedPhone} | نص الرسالة: \n${bodyText}`);
    return true; // محاكاة الإرسال بنجاح في بيئة التطوير
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
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

    const data = await response.json();
    if (!response.ok) {
      console.error("Meta WhatsApp API Error:", data);
      return false;
    }

    return true;
  } catch (error) {
    console.error("خطأ أثناء إرسال رسالة الواتساب:", error);
    return false;
  }
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
