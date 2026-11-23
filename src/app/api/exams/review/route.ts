import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getExamAttemptReview } from "@/lib/exam-engine";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const url = new URL(req.url);
    const attemptId = url.searchParams.get("attemptId");
    const examId = url.searchParams.get("examId");

    let targetAttemptId = attemptId;

    if (!targetAttemptId && examId) {
      const attempt = await prisma.examAttempt.findFirst({
        where: { examId, userId },
        orderBy: { createdAt: "desc" },
      });
      if (!attempt) {
        return NextResponse.json({ error: "لم يتم العثور على محاولة لهذا الامتحان" }, { status: 404 });
      }
      targetAttemptId = attempt.id;
    }

    if (!targetAttemptId) {
      return NextResponse.json({ error: "معرف المحاولة أو الامتحان مطلوب" }, { status: 400 });
    }

    const review = await getExamAttemptReview(targetAttemptId, userId);
    return NextResponse.json(review);
  } catch (error: any) {
    console.error("Exam Review GET Error:", error);
    return NextResponse.json({ error: error.message || "فشل جلب تفاصيل وإجابات الامتحان" }, { status: 400 });
  }
}
