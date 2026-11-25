import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import {
  getAiLlmConfigSummary,
  saveAiLlmConfig,
  testConfiguredAiProvider,
  getTeachingStyleGuide,
  saveTeachingStyleGuide,
  syncPendingLectureDigests,
} from "@/lib/ai-companion";

export const maxDuration = 60;

async function getLectureSyncStats() {
  const [analyzedVideosCount, totalYoutubeCount] = await Promise.all([
    prisma.video.count({
      where: {
        aiDigest: { not: null },
        NOT: { videoId: { startsWith: "demo-" } },
      },
    }),
    prisma.video.count({
      where: {
        provider: "YOUTUBE",
        NOT: { videoId: { startsWith: "demo-" } },
      },
    }),
  ]);
  return { analyzedVideosCount, totalYoutubeCount };
}

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const [summary, teachingStyle, stats] = await Promise.all([
      getAiLlmConfigSummary(),
      getTeachingStyleGuide(),
      getLectureSyncStats(),
    ]);
    return NextResponse.json({
      success: true,
      config: summary,
      teachingStyle,
      ...stats,
    });
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
      if (typeof body.teachingStyle === "string") {
        await saveTeachingStyleGuide(body.teachingStyle);
      }

      const [summary, teachingStyle, stats] = await Promise.all([
        getAiLlmConfigSummary(),
        getTeachingStyleGuide(),
        getLectureSyncStats(),
      ]);
      return NextResponse.json({
        success: true,
        config: summary,
        teachingStyle,
        ...stats,
        message: "تم حفظ الإعدادات وتشفيرها بنجاح ✅",
      });
    }

    if (action === "SYNC_LECTURES") {
      const result = await syncPendingLectureDigests({
        limit: 10,
        force: Boolean(body.force),
      });
      const stats = await getLectureSyncStats();
      return NextResponse.json({
        success: true,
        ...result,
        ...stats,
        message:
          result.totalEligible === 0
            ? `كل المحاضرات (${stats.analyzedVideosCount}/${stats.totalYoutubeCount}) مسموعة ومستوعبة بالفعل 🎧`
            : `تم سماع واستيعاب ${result.analyzedCount} محاضرة جديدة بنجاح 🎧 (الإجمالي: ${stats.analyzedVideosCount}/${stats.totalYoutubeCount})`,
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
