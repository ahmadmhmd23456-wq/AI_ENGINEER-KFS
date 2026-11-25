import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { detectVideoProvider, fetchVideoMetadata } from "@/lib/video-helper";
import { notifyStudentsOfNewLecture, analyzeLectureVideo } from "@/lib/ai-companion";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

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

    // 2. ربط فيديو بحصة معينة (YouTube, Bunny Stream, Google Drive, Direct)
    if (action === "ADD_VIDEO") {
      if (!lessonId || !videoData?.videoId || !videoData?.title) {
        return NextResponse.json({ error: "بيانات الفيديو ناقصة" }, { status: 400 });
      }

      const detected = detectVideoProvider(videoData.videoId, videoData.provider || "YOUTUBE");
      let finalDurationSeconds = videoData.durationSeconds ? parseInt(String(videoData.durationSeconds), 10) : 0;

      if (!finalDurationSeconds || videoData.autoDetectDuration) {
        const meta = await fetchVideoMetadata(videoData.videoId, videoData.provider || "YOUTUBE");
        if (meta.durationSeconds) {
          finalDurationSeconds = meta.durationSeconds;
        }
      }

      const video = await prisma.video.create({
        data: {
          lessonId,
          title: videoData.title,
          videoId: detected.videoId,
          provider: detected.provider,
          durationSeconds: finalDurationSeconds > 0 ? finalDurationSeconds : 3600,
          isPreviewFree: videoData.isPreviewFree || false,
        },
        include: {
          lesson: true,
        },
      });

      // سماع واستيعاب محتوى وأسلوب شرح المحاضرة تلقائياً في الخلفية/المهلة
      const aiAnalysis = await analyzeLectureVideo(video.id).catch(() => null);

      // إخطار الطلاب المشتركين عبر الرفيق الذكي والواتساب الخاص بهم عند نشر فيديو/محاضرة جديدة
      if (
        video.lesson.isPublished &&
        (!video.lesson.publishAt || new Date(video.lesson.publishAt) <= new Date())
      ) {
        notifyStudentsOfNewLecture({
          subjectId: video.lesson.subjectId,
          lessonTitle: video.lesson.title,
          videoTitle: video.title,
          durationSeconds: video.durationSeconds,
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        video,
        aiAnalyzed: Boolean(aiAnalysis?.ok),
      });
    }

    // 2.5 تعديل بيانات أو رابط أو مدة فيديو موجود (مع اكتشاف المدة تلقائياً)
    if (action === "UPDATE_VIDEO") {
      const { videoRecordId } = body;
      if (!videoRecordId) {
        return NextResponse.json({ error: "معرف الفيديو مطلوب" }, { status: 400 });
      }

      const existing = await prisma.video.findUnique({ where: { id: videoRecordId } });
      if (!existing) {
        return NextResponse.json({ error: "الفيديو غير موجود" }, { status: 404 });
      }

      const rawInput = videoData?.videoId?.trim() || existing.videoId;
      const detected = detectVideoProvider(rawInput, videoData?.provider || existing.provider);
      let finalDurationSeconds = videoData?.durationSeconds ? parseInt(String(videoData.durationSeconds), 10) : 0;

      if (!finalDurationSeconds || videoData?.autoDetectDuration) {
        const meta = await fetchVideoMetadata(rawInput, videoData?.provider || existing.provider);
        if (meta.durationSeconds) {
          finalDurationSeconds = meta.durationSeconds;
        }
      }

      const updated = await prisma.video.update({
        where: { id: videoRecordId },
        data: {
          title: videoData?.title ?? existing.title,
          videoId: detected.videoId,
          provider: detected.provider,
          durationSeconds: finalDurationSeconds > 0 ? finalDurationSeconds : existing.durationSeconds,
          isPreviewFree: videoData?.isPreviewFree !== undefined ? videoData.isPreviewFree : existing.isPreviewFree,
        },
      });

      const aiAnalysis = await analyzeLectureVideo(updated.id).catch(() => null);

      return NextResponse.json({
        success: true,
        video: updated,
        aiAnalyzed: Boolean(aiAnalysis?.ok),
      });
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
