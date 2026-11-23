import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPaymobHmac, doubleVerifyTransactionWithPaymob } from "@/lib/paymob";
import { sendPaymentSuccessWhatsApp } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hmacReceived = searchParams.get("hmac") || req.headers.get("x-paymob-hmac") || "";

    const payload = await req.json();
    const obj = payload.obj || payload;

    // 1. فحص التوقيع HMAC SHA-512
    const isHmacValid = verifyPaymobHmac(payload, hmacReceived);
    if (!isHmacValid) {
      console.warn("Paymob Webhook HMAC verification failed!");
      return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 400 });
    }

    const transactionId = obj.id?.toString();
    const orderId = obj.order?.id?.toString() || obj.order?.toString();
    const isSuccess = obj.success === true;

    if (!isSuccess) {
      console.log(`Paymob transaction ${transactionId} failed or cancelled.`);
      return NextResponse.json({ received: true });
    }

    // 2. التأكيد المزدوج (Double-Verification) بالاتصال المباشر بـ Paymob API
    const isDoubleVerified = await doubleVerifyTransactionWithPaymob(transactionId);
    if (!isDoubleVerified) {
      console.error(`Paymob double verification failed for transaction: ${transactionId}`);
      return NextResponse.json({ error: "Double verification failed" }, { status: 400 });
    }

    // 3. البحث عن عملية الشراء المعلقة وتحديثها (Idempotent update)
    let purchase = await prisma.purchase.findFirst({
      where: {
        OR: [
          { gatewayOrderId: orderId },
          { transactionId: transactionId },
        ],
      },
      include: {
        user: true,
        subject: true,
      },
    });

    if (purchase) {
      if (purchase.status !== "COMPLETED") {
        await prisma.purchase.update({
          where: { id: purchase.id },
          data: {
            status: "COMPLETED",
            transactionId,
            rawCallback: payload,
          },
        });

        // إرسال رسالة واتساب للطالب بتأكيد الشراء وفتح المادة فوراً
        if (purchase.user.phone) {
          try {
            await sendPaymentSuccessWhatsApp({
              phone: purchase.user.phone,
              studentName: purchase.user.name,
              subjectName: purchase.subject.name,
              amount: Number(purchase.amount),
            });
          } catch (e) {
            console.error("فشل إرسال إشعار الواتساب لتأكيد الدفع:", e);
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: "Webhook processed and subject unlocked." });
  } catch (error: any) {
    console.error("Paymob Webhook Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
