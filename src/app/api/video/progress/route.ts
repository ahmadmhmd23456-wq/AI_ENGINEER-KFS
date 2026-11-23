import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { videoId, positionSeconds, durationSeconds } = await req.json();

    if (!videoId || positionSeconds === undefined) {
      return NextResponse.json({ error: "البيانات ناقصة" }, { status: 400 });
    }

    const isCompleted = durationSeconds > 0 ? positionSeconds >= durationSeconds * 0.9 : false;

    const progress = await prisma.videoProgress.upsert({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
      update: {
        lastPositionSeconds: Math.floor(positionSeconds),
        isCompleted: isCompleted ? true : undefined,
      },
      create: {
        userId,
        videoId,
        lastPositionSeconds: Math.floor(positionSeconds),
        maxPositionSeconds: Math.floor(positionSeconds),
        isCompleted,
      },
    });

    return NextResponse.json({ success: true, progress });
  } catch (error) {
    console.error("Video Progress Error:", error);
    return NextResponse.json({ error: "فشل حفظ تقدم المشاهدة" }, { status: 500 });
  }
}
