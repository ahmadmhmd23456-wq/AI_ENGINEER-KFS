import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        academicLevel: true,
        purchases: {
          where: { status: "COMPLETED" },
          select: { subjectId: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    // جلب المواد الخاصة بدفعة الطالب
    const levelId = user.academicLevelId;
    const subjects = await prisma.subject.findMany({
      where: levelId ? { academicLevelId: levelId, isActive: true } : { isActive: true },
      include: {
        academicLevel: true,
        _count: {
          select: {
            lessons: true,
            exams: true,
          },
        },
      },
      orderBy: [{ term: "asc" }, { order: "asc" }],
    });

    const purchasedSubjectIds = new Set(user.purchases.map((p) => p.subjectId));

    const enrichedSubjects = subjects.map((sub) => ({
      ...sub,
      isPurchased: purchasedSubjectIds.has(sub.id) || user.role === "ADMIN",
    }));

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        academicLevel: user.academicLevel,
        canChangeLevel: user.canChangeLevel,
      },
      subjects: enrichedSubjects,
    });
  } catch (error) {
    console.error("Student Courses GET Error:", error);
    return NextResponse.json({ error: "فشل تحميل المواد" }, { status: 500 });
  }
}
