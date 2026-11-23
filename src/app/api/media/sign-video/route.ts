import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateBunnySignedUrl } from "@/lib/bunny";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    if (!userId) {
      return NextResponse.json({ error: "غير مصرح، يرجى تسجيل الدخول" }, { status: 401 });
    }

    const { videoId } = await req.json();

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        lesson: {
          include: { subject: true },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: "الفيديو غير موجود" }, { status: 404 });
    }

    // فحص تاريخ الجدولة
    if (video.lesson.publishAt && new Date(video.lesson.publishAt) > new Date() && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "هذه الحصة مجدولة للعرض في تاريخ لاحق" },
        { status: 403 }
      );
    }

    // إذا كان الأدمن أو الفيديو متاح مجاناً للمعاينة
    let isAuthorized = userRole === "ADMIN" || video.isPreviewFree;

    if (!isAuthorized) {
      // التحقق من شراء المادة
      const purchase = await prisma.purchase.findFirst({
        where: {
          userId,
          subjectId: video.lesson.subjectId,
          status: "COMPLETED",
        },
      });

      if (!purchase) {
        return NextResponse.json(
          { error: "يجب شراء هذه المادة أولاً لمشاهدة الفيديو" },
          { status: 403 }
        );
      }
    }

    // جلب مكان التوقف السابق للطالب
    const progress = await prisma.videoProgress.findUnique({
      where: {
        userId_videoId: {
          userId,
          videoId: video.id,
        },
      },
    });

    // توليد رابط التوقيع الآمن من Bunny Stream
    const signedUrl = generateBunnySignedUrl(video.videoId, 7200);

    return NextResponse.json({
      success: true,
      signedUrl,
      lastPositionSeconds: progress?.lastPositionSeconds || 0,
      duration: video.durationSeconds,
    });
  } catch (error: any) {
    console.error("Sign Video Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء إعداد رابط الفيديو" }, { status: 500 });
  }
}
