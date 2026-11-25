import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (dbUser?.status === "LOCKED") {
      return NextResponse.json(
        { error: "ACCOUNT_LOCKED" },
        { status: 403 }
      );
    }

    const { subjectId } = await params;

    // 1. التحقق من شراء المادة
    if (userRole !== "ADMIN") {
      const purchase = await prisma.purchase.findFirst({
        where: {
          userId,
          subjectId,
          status: "COMPLETED",
        },
      });

      if (!purchase) {
        return NextResponse.json(
          { error: "هذا الكورس مغلق، يتطلب تفعيل الاشتراك يدوياً من قِبل م/ أحمد" },
          { status: 403 }
        );
      }
    }

    // 2. جلب تفاصيل المادة ومحتوياتها
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        academicLevel: true,
        lessons: {
          where: userRole === "ADMIN" ? {} : { isPublished: true },
          orderBy: { order: "asc" },
          include: {
            videos: { orderBy: { order: "asc" } },
            files: { orderBy: { order: "asc" } },
          },
        },
        exams: {
          where: userRole === "ADMIN" ? {} : { isPublished: true },
          orderBy: { createdAt: "desc" },
          include: {
            attempts: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!subject) {
      return NextResponse.json({ error: "المادة غير موجودة" }, { status: 404 });
    }

    return NextResponse.json(subject);
  } catch (error) {
    console.error("Subject Content GET Error:", error);
    return NextResponse.json({ error: "فشل تحميل محتوى المادة" }, { status: 500 });
  }
}
