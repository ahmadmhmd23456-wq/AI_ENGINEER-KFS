import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { finalizeAndGradeAttempt, getExamAttemptReview } from "@/lib/exam-engine";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { attemptId, answers, violationReason, isTimedOut } = await req.json();

    const result = await finalizeAndGradeAttempt(
      attemptId,
      userId,
      Boolean(isTimedOut),
      answers,
      Boolean(violationReason)
    );

    if (violationReason) {
      const ipAddress =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "unknown";
      const userAgent = req.headers.get("user-agent") || "unknown";
      await prisma.auditLog
        .create({
          data: {
            userId,
            action: "EXAM_AUTO_SUBMIT",
            ipAddress,
            userAgent,
            reason: `📝 تسليم تلقائي للامتحان: ${String(violationReason).slice(0, 200)}`,
          },
        })
        .catch(() => {});
    }

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
