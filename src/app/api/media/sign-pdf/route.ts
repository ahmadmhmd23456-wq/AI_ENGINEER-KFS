import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generatePresignedPdfUrl } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    if (!userId) {
      return NextResponse.json({ error: "غير مصرح، يرجى تسجيل الدخول" }, { status: 401 });
    }

    const { fileId } = await req.json();

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        lesson: {
          include: { subject: true },
        },
      },
    });

    if (!file) {
      return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });
    }

    let isAuthorized = userRole === "ADMIN" || file.isPreviewFree;

    if (!isAuthorized) {
      const purchase = await prisma.purchase.findFirst({
        where: {
          userId,
          subjectId: file.lesson.subjectId,
          status: "COMPLETED",
        },
      });

      if (!purchase) {
        return NextResponse.json(
          { error: "يجب شراء هذه المادة أولاً للاطلاع على هذا الملف" },
          { status: 403 }
        );
      }
    }

    const presignedUrl = generatePresignedPdfUrl(file.s3Key, 900); // 15 دقيقة

    return NextResponse.json({
      success: true,
      presignedUrl,
      title: file.title,
    });
  } catch (error: any) {
    console.error("Sign PDF Error:", error);
    return NextResponse.json({ error: "فشل إعداد رابط الملف" }, { status: 500 });
  }
}
