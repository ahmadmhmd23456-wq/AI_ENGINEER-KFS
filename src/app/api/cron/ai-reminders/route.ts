import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStudentLearningContext, sendPhoneReminderToStudent } from "@/lib/ai-companion";

async function dispatchReminders(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  const authHeader = req.headers.get("authorization");
  const querySecret = new URL(req.url).searchParams.get("secret");

  if (secret && authHeader !== `Bearer ${secret}` && querySecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000);

  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      status: "ACTIVE",
      aiWhatsappReminders: true,
      phone: { not: null },
      OR: [{ lastAiReminderAt: null }, { lastAiReminderAt: { lte: twentyHoursAgo } }],
    },
    select: { id: true },
  });

  let remindedCount = 0;

  for (const s of students) {
    const context = await getStudentLearningContext(s.id);
    if (!context) continue;

    const hasPending =
      context.unwatchedLectures.length > 0 ||
      context.unfinishedLectures.length > 0 ||
      context.pendingExams.length > 0;

    if (hasPending) {
      const res = await sendPhoneReminderToStudent(s.id);
      if (res.sent) remindedCount++;
    }
  }

  return NextResponse.json({
    success: true,
    checkedStudents: students.length,
    remindedCount,
  });
}

export async function GET(req: NextRequest) {
  try {
    return await dispatchReminders(req);
  } catch (error: any) {
    console.error("Cron AI Reminders Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
