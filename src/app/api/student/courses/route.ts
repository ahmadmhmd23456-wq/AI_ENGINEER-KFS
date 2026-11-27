import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const queryDept = searchParams.get("department");

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

    const isAdmin = user.role === "ADMIN";
    const isPrep = user.academicLevel?.slug === "prep";
    const targetDept = isAdmin
      ? queryDept || user.department || null
      : isPrep
      ? "GENERAL"
      : user.department || "GENERAL";

    // جلب المواد الخاصة بدفعة الطالب وقسمه الهندسي بترتيب الأدمن
    const levelId = user.academicLevelId;
    
    // بناء شرط القسم: مواد التخصص المختار + المواد العامة المشتركة
    const whereCondition: any = {
      isActive: true,
    };

    if (levelId) {
      whereCondition.academicLevelId = levelId;
    }

    if (targetDept && targetDept !== "ALL") {
      whereCondition.OR = [
        { department: targetDept },
        { department: "GENERAL" },
        { department: null },
      ];
    }

    const subjects = await prisma.subject.findMany({
      where: whereCondition,
      include: {
        academicLevel: true,
        _count: {
          select: {
            lessons: true,
            exams: true,
          },
        },
      },
      orderBy: [
        { order: "asc" },
        { term: "asc" },
        { createdAt: "asc" },
      ],
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
        role: user.role,
        academicLevel: user.academicLevel,
        canChangeLevel: user.canChangeLevel,
        department: user.department || null,
      },
      currentDepartment: targetDept,
      subjects: enrichedSubjects,
    });
  } catch (error) {
    console.error("Student Courses GET Error:", error);
    return NextResponse.json({ error: "فشل تحميل المواد" }, { status: 500 });
  }
}
