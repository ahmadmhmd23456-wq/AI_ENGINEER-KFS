import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { transactionId: { contains: search } },
        { gatewayOrderId: { contains: search } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { phone: { contains: search } } },
        { subject: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        subject: { select: { id: true, name: true, code: true, term: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    });

    const subjects = await prisma.subject.findMany({
      select: { id: true, name: true, price: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ purchases, students, subjects });
  } catch (error) {
    console.error("Admin Payments GET Error:", error);
    return NextResponse.json({ error: "فشل تحميل المدفوعات" }, { status: 500 });
  }
}

// فتح مادة يدوياً للطالب (Manual Grant)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, subjectId, adminNotes } = body;

    if (!userId || !subjectId) {
      return NextResponse.json({ error: "برجاء اختيار الطالب والمادة" }, { status: 400 });
    }

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) return NextResponse.json({ error: "المادة غير موجودة" }, { status: 404 });

    const purchase = await prisma.purchase.upsert({
      where: {
        userId_subjectId: { userId, subjectId },
      },
      update: {
        status: "COMPLETED",
        paymentMethod: "MANUAL_GRANT",
        paymentGateway: "MANUAL",
        adminNotes: adminNotes || "فتح يدوي من الأدمن",
      },
      create: {
        userId,
        subjectId,
        amount: subject.price,
        status: "COMPLETED",
        paymentMethod: "MANUAL_GRANT",
        paymentGateway: "MANUAL",
        transactionId: "MANUAL_TX_" + Date.now(),
        adminNotes: adminNotes || "فتح يدوي من الأدمن",
      },
    });

    return NextResponse.json({ success: true, message: "تم تفعيل المادة للطالب يدوياً بنجاح!", purchase });
  } catch (error: any) {
    console.error("Manual Grant Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
