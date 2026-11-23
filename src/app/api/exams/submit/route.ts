import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { finalizeAndGradeAttempt, getExamAttemptReview } from "@/lib/exam-engine";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { attemptId, answers } = await req.json();

    const result = await finalizeAndGradeAttempt(attemptId, userId, false, answers);
    const review = await getExamAttemptReview(attemptId, userId);

    return NextResponse.json({
      success: true,
      score: result.score,
      isPassed: result.isPassed,
      submittedAt: result.submittedAt,
      review,
    });
  } catch (error: any) {
    console.error("Submit Exam Error:", error);
    return NextResponse.json({ error: error.message || "فشل تسليم الامتحان" }, { status: 400 });
  }
}
