import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetType, targetId, messageText } = body;

    if (!messageText || !targetType) {
      return NextResponse.json({ error: "برجاء كتابة نص الرسالة وتحديد الجمهور المستهدف" }, { status: 400 });
    }

    let recipients: { id: string; name: string; phone: string | null }[] = [];

    if (targetType === "ALL_STUDENTS") {
      recipients = await prisma.user.findMany({
        where: { role: "STUDENT", status: "ACTIVE", phone: { not: null } },
        select: { id: true, name: true, phone: true },
      });
    } else if (targetType === "ACADEMIC_LEVEL" && targetId) {
      recipients = await prisma.user.findMany({
        where: { role: "STUDENT", status: "ACTIVE", academicLevelId: targetId, phone: { not: null } },
        select: { id: true, name: true, phone: true },
      });
    } else if (targetType === "SUBJECT_ENROLLED" && targetId) {
      const purchases = await prisma.purchase.findMany({
        where: { subjectId: targetId, status: "COMPLETED" },
        include: { user: { select: { id: true, name: true, phone: true } } },
      });
      recipients = purchases.map((p) => p.user);
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: "لم يتم العثور على طلاب مطابقين يمتلكون أرقام هواتف" }, { status: 404 });
    }

    // إرسال الرسائل وحفظ السجل في Notification
    let sentCount = 0;
    for (const student of recipients) {
      if (!student.phone) continue;
      // استبدال المتغيرات في الرسالة
      const personalizedMsg = messageText.replace(/\{name\}/g, student.name);

      await prisma.notification.create({
        data: {
          userId: student.id,
          channel: "WHATSAPP",
          type: "BROADCAST",
          title: "رسالة من مدرس المادة",
          body: personalizedMsg,
          status: "SENT",
        },
      });

      try {
        await sendWhatsAppMessage(student.phone, personalizedMsg);
        sentCount++;
      } catch (err) {
        console.error("فشل إرسال رسالة للطالب:", student.name, err);
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      totalRecipients: recipients.length,
      message: `تم إرسال الرسالة بنجاح إلى ${sentCount} طالب عبر الواتساب.`,
    });
  } catch (error: any) {
    console.error("Broadcast Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
