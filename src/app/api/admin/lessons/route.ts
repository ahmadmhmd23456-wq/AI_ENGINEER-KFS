import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, subjectId, lessonId, title, description, order, publishAt, isPublished, videoData, fileData } = body;

    // 1. إضافة درس / محاضرة جديدة
    if (action === "CREATE_LESSON") {
      if (!subjectId || !title) return NextResponse.json({ error: "البيانات ناقصة" }, { status: 400 });

      const lesson = await prisma.lesson.create({
        data: {
          subjectId,
          title,
          description,
          order: order ? parseInt(order) : 0,
          publishAt: publishAt ? new Date(publishAt) : null,
          isPublished: isPublished !== undefined ? isPublished : true,
        },
      });

      return NextResponse.json({ success: true, lesson });
    }

    // 2. ربط فيديو بحصة معينة (Bunny Stream)
    if (action === "ADD_VIDEO") {
      if (!lessonId || !videoData?.videoId || !videoData?.title) {
        return NextResponse.json({ error: "بيانات الفيديو ناقصة" }, { status: 400 });
      }

      const video = await prisma.video.create({
        data: {
          lessonId,
          title: videoData.title,
          videoId: videoData.videoId,
          provider: videoData.provider || "BUNNY",
          durationSeconds: videoData.durationSeconds ? parseInt(videoData.durationSeconds) : 3600,
          isPreviewFree: videoData.isPreviewFree || false,
        },
      });

      return NextResponse.json({ success: true, video });
    }

    // 3. ربط ملف PDF بحصة معينة (Cloudflare R2 / S3)
    if (action === "ADD_FILE") {
      if (!lessonId || !fileData?.s3Key || !fileData?.title) {
        return NextResponse.json({ error: "بيانات الملف ناقصة" }, { status: 400 });
      }

      const file = await prisma.file.create({
        data: {
          lessonId,
          title: fileData.title,
          s3Key: fileData.s3Key,
          fileSize: fileData.fileSize ? parseInt(fileData.fileSize) : 1024000,
          fileType: "application/pdf",
          isPreviewFree: fileData.isPreviewFree || false,
        },
      });

      return NextResponse.json({ success: true, file });
    }

    // 4. حذف درس أو فيديو أو ملف
    if (action === "DELETE_ITEM") {
      const { itemType, itemId } = body;
      if (itemType === "LESSON") await prisma.lesson.delete({ where: { id: itemId } });
      else if (itemType === "VIDEO") await prisma.video.delete({ where: { id: itemId } });
      else if (itemType === "FILE") await prisma.file.delete({ where: { id: itemId } });

      return NextResponse.json({ success: true, message: "تم الحذف بنجاح" });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error: any) {
    console.error("Admin Lessons Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
