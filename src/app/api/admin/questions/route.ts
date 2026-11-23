import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, subjectId, text, type, points, options, correctAnswer, explanation, bulkQuestions } = body;

    // استيراد جماعي (Bulk Import من CSV / JSON)
    if (action === "BULK_IMPORT" && Array.isArray(bulkQuestions)) {
      if (!subjectId) return NextResponse.json({ error: "المادة مطلوبة" }, { status: 400 });

      let createdCount = 0;
      for (const q of bulkQuestions) {
        if (!q.text || !q.correctAnswer) continue;
        await prisma.question.create({
          data: {
            subjectId,
            text: q.text,
            type: q.type || "MCQ",
            points: q.points ? parseFloat(q.points) : 1.0,
            options: q.options || [
              { id: "A", text: q.optionA || "الخيار أ" },
              { id: "B", text: q.optionB || "الخيار ب" },
              { id: "C", text: q.optionC || "الخيار ج" },
              { id: "D", text: q.optionD || "الخيار د" },
            ],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
          },
        });
        createdCount++;
      }

      return NextResponse.json({
        success: true,
        message: `تم رفع وإضافة ${createdCount} سؤال إلى بنك الأسئلة بنجاح.`,
      });
    }

    // إضافة سؤال فردي
    if (!subjectId || !text || !correctAnswer) {
      return NextResponse.json({ error: "البيانات ناقصة" }, { status: 400 });
    }

    const question = await prisma.question.create({
      data: {
        subjectId,
        text,
        type: type || "MCQ",
        points: points ? parseFloat(points) : 1.0,
        options: options || [],
        correctAnswer,
        explanation,
      },
    });

    return NextResponse.json({ success: true, question });
  } catch (error: any) {
    console.error("Questions POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
