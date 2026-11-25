import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import {
  getAiLlmConfigSummary,
  saveAiLlmConfig,
  testConfiguredAiProvider,
} from "@/lib/ai-companion";

export const maxDuration = 60;

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const summary = await getAiLlmConfigSummary();
    return NextResponse.json({ success: true, config: summary });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "فشل قراءة إعدادات الذكاء الاصطناعي" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await req.json();
    const { action } = body;

    if (action === "SAVE_CONFIG") {
      await saveAiLlmConfig({
        geminiKey: body.geminiKey,
        groqKey: body.groqKey,
        openRouterKey: body.openRouterKey,
        openAiKey: body.openAiKey,
      });

      const summary = await getAiLlmConfigSummary();
      return NextResponse.json({
        success: true,
        config: summary,
        message: "تم حفظ مفاتيح الذكاء الاصطناعي وتشفيرها بنجاح ✅",
      });
    }

    if (action === "TEST_AI") {
      const test = await testConfiguredAiProvider();
      if (!test.ok) {
        return NextResponse.json(
          { error: test.error || "فشل اختبار الذكاء الاصطناعي", provider: test.provider },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        provider: test.provider,
        reply: test.reply,
        message: `النظام متصل ويعمل بكفاءة عبر ${test.provider} ✅`,
      });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "حدث خطأ أثناء تحديث إعدادات الذكاء الاصطناعي" },
      { status: 500 }
    );
  }
}
