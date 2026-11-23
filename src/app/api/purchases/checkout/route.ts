import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createPaymobOrder } from "@/lib/paymob";
import { sendPaymentSuccessWhatsApp } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "غير مصرح، يرجى تسجيل الدخول" }, { status: 401 });
    }

    const { subjectId, paymentMethod, isDemoInstantPay } = await req.json();

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!user || !subject) {
      return NextResponse.json({ error: "المستخدم أو المادة غير موجودة" }, { status: 404 });
    }

    // فحص هل المادة مشتراة بالفعل
    const existing = await prisma.purchase.findFirst({
      where: {
        userId,
        subjectId,
        status: "COMPLETED",
      },
    });

    if (existing) {
      return NextResponse.json({ error: "أنت مشترك بالفعل في هذه المادة!" }, { status: 400 });
    }

    const amount = Number(subject.price);

    // إذا طلب تجربة الدفع الفوري (محاكاة بيئة التطوير)
    if (isDemoInstantPay || !process.env.PAYMOB_API_KEY) {
      const mockTrxId = "TRX_MOCK_" + Date.now();
      const purchase = await prisma.purchase.upsert({
        where: {
          userId_subjectId: { userId, subjectId },
        },
        update: {
          status: "COMPLETED",
          amount,
          paymentMethod: paymentMethod || "WALLET",
          paymentGateway: "PAYMOB",
          transactionId: mockTrxId,
        },
        create: {
          userId,
          subjectId,
          amount,
          status: "COMPLETED",
          paymentMethod: paymentMethod || "WALLET",
          paymentGateway: "PAYMOB",
          transactionId: mockTrxId,
        },
      });

      // إرسال رسالة واتساب للطالب
      if (user.phone) {
        await sendPaymentSuccessWhatsApp({
          phone: user.phone,
          studentName: user.name,
          subjectName: subject.name,
          amount,
        });
      }

      return NextResponse.json({
        success: true,
        isInstantUnlocked: true,
        message: "تم تأكيد الدفع وفتح المادة بنجاح!",
      });
    }

    // بدء العملية مع Paymob
    const paymobOrder = await createPaymobOrder({
      amountEgp: amount,
      studentName: user.name,
      studentEmail: user.email,
      studentPhone: user.phone || "01000000000",
      subjectName: subject.name,
      paymentMethod: paymentMethod || "CARD",
    });

    await prisma.purchase.upsert({
      where: {
        userId_subjectId: { userId, subjectId },
      },
      update: {
        status: "PENDING",
        amount,
        gatewayOrderId: paymobOrder.orderId,
        paymentMethod: paymentMethod || "CARD",
      },
      create: {
        userId,
        subjectId,
        amount,
        status: "PENDING",
        gatewayOrderId: paymobOrder.orderId,
        paymentMethod: paymentMethod || "CARD",
      },
    });

    return NextResponse.json({
      success: true,
      paymentUrl: paymobOrder.paymentUrl,
      orderId: paymobOrder.orderId,
    });
  } catch (error: any) {
    console.error("Checkout Error:", error);
    return NextResponse.json({ error: error.message || "فشل بدء عملية الدفع" }, { status: 500 });
  }
}
