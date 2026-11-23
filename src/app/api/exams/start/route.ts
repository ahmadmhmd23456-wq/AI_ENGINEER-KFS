import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { startOrResumeExam } from "@/lib/exam-engine";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    if (!userId) {
      return NextResponse.json({ error: "غير مصرح، يرجى تسجيل الدخول" }, { status: 401 });
    }

    const { examId } = await req.json();

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { subject: true },
    });

    if (!exam) {
      return NextResponse.json({ error: "الامتحان غير موجود" }, { status: 404 });
    }

    // التحقق من شراء المادة إذا كان طالباً
    if (userRole !== "ADMIN") {
      const purchase = await prisma.purchase.findFirst({
        where: {
          userId,
          subjectId: exam.subjectId,
          status: "COMPLETED",
        },
      });

      if (!purchase) {
        return NextResponse.json(
          { error: "يجب شراء المادة أولاً لدخول الامتحان" },
          { status: 403 }
        );
      }
    }

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Web-Browser";

    const result = await startOrResumeExam({
      examId,
      userId,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Start Exam Error:", error);
    return NextResponse.json({ error: error.message || "فشل بدء الامتحان" }, { status: 400 });
  }
}
