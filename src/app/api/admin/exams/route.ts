import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");

    const where: any = {};
    if (subjectId) where.subjectId = subjectId;

    const exams = await prisma.exam.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, academicLevel: true } },
        attempts: {
          include: {
            user: { select: { id: true, name: true, phone: true } },
          },
          orderBy: { score: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const subjects = await prisma.subject.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    // جلب أسئلة بنك الأسئلة
    const questions = await prisma.question.findMany({
      where: subjectId ? { subjectId } : undefined,
      include: { subject: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ exams, subjects, questions });
  } catch (error) {
    console.error("Admin Exams GET Error:", error);
    return NextResponse.json({ error: "فشل تحميل الامتحانات" }, { status: 500 });
  }
}

// إنشاء أو تعديل امتحان
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      subjectId,
      title,
      description,
      durationMinutes,
      totalMarks,
      passMarks,
      questionsToSelect,
      windowStartTime,
      windowEndTime,
      showAnswersPolicy,
      isPublished,
    } = body;

    if (!subjectId || !title || !durationMinutes || !totalMarks || !questionsToSelect) {
      return NextResponse.json({ error: "برجاء استكمال كافة حقول الامتحان المطلوبة" }, { status: 400 });
    }

    const data: any = {
      subjectId,
      title,
      description,
      durationMinutes: parseInt(durationMinutes),
      totalMarks: parseFloat(totalMarks),
      passMarks: parseFloat(passMarks || totalMarks / 2),
      questionsToSelect: parseInt(questionsToSelect),
      windowStartTime: new Date(windowStartTime || Date.now()),
      windowEndTime: new Date(windowEndTime || Date.now() + 86400000),
      showAnswersPolicy: showAnswersPolicy || "AFTER_WINDOW_CLOSES",
      isPublished: isPublished !== undefined ? isPublished : true,
    };

    let exam;
    if (id) {
      exam = await prisma.exam.update({ where: { id }, data });
    } else {
      exam = await prisma.exam.create({ data });
    }

    return NextResponse.json({ success: true, exam });
  } catch (error: any) {
    console.error("Admin Exams POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
