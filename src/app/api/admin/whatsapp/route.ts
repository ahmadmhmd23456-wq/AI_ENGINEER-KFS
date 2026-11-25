import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import {
  getWhatsAppConfigSummary,
  saveWhatsAppConfig,
  sendWhatsAppDetailed,
  WhatsAppProviderType,
} from "@/lib/whatsapp";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const summary = await getWhatsAppConfigSummary();
    return NextResponse.json({ success: true, config: summary });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "فشل قراءة إعدادات الواتساب" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await req.json();
    const { action } = body;

    if (action === "SAVE_CONFIG") {
      const provider = (body.provider as WhatsAppProviderType) || "ULTRAMSG";
      if (!["META", "ULTRAMSG", "CUSTOM"].includes(provider)) {
        return NextResponse.json({ error: "مزود غير معروف" }, { status: 400 });
      }

      await saveWhatsAppConfig({
        provider,
        senderPhone: body.senderPhone,
        metaPhoneNumberId: body.metaPhoneNumberId,
        metaAccessToken: body.metaAccessToken,
        ultramsgInstanceId: body.ultramsgInstanceId,
        ultramsgToken: body.ultramsgToken,
        customApiUrl: body.customApiUrl,
        customApiToken: body.customApiToken,
      });

      const summary = await getWhatsAppConfigSummary();
      return NextResponse.json({
        success: true,
        config: summary,
        message: "تم حفظ إعدادات ربط رقم الواتساب وتشفيرها بنجاح ✅",
      });
    }

    if (action === "TEST_SEND") {
      const testPhone = String(body.testPhone || "").trim();
      if (!testPhone) {
        return NextResponse.json({ error: "اكتب رقم الهاتف المراد إرسال رسالة الاختبار إليه" }, { status: 400 });
      }

      const result = await sendWhatsAppDetailed(
        testPhone,
        "✅ تجربة اتصال ناجحة من منصة هندسة التعليمية!\nرقم الواتساب الخاص بالمنصة يعمل الآن وجاهز لإرسال تنبيهات المحاضرات والنتائج للطلاب."
      );

      if (!result.ok) {
        return NextResponse.json(
          { error: result.error || "فشل إرسال رسالة الاختبار" },
          { status: 400 }
        );
      }

      if (result.simulated) {
        return NextResponse.json(
          {
            error:
              "لم يتم ربط بوابة واتساب حقيقية بعد! يرجى حفظ بيانات UltraMsg أو Meta Cloud API أعلاه أولاً.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        provider: result.provider,
        message: `🎉 تم إرسال رسالة الاختبار بنجاح إلى (${testPhone}) عبر ${result.provider}!`,
      });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (err: any) {
    console.error("Admin WhatsApp Config Error:", err);
    return NextResponse.json({ error: err.message || "حدث خطأ" }, { status: 500 });
  }
}
