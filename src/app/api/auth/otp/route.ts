import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendOtpWhatsApp } from "@/lib/whatsapp";

// التحقق من صيغة الهاتف المصري: 010, 011, 012, 015 متبوعة بـ 8 أرقام
const EGYPT_PHONE_REGEX = /^01[0125][0-9]{8}$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, phone, code } = body;

    if (!phone || !EGYPT_PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { error: "برجاء إدخال رقم هاتف مصري صحيح يبدأ بـ 01 (11 رقماً)" },
        { status: 400 }
      );
    }

    if (action === "SEND_OTP") {
      // 1. فحص هل الرقم مستخدم بالفعل بحساب Google آخر مفعل؟
      const existingUser = await prisma.user.findFirst({
        where: {
          phone,
          phoneVerified: { not: null },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "هذا الرقم مسجل مسبقاً بحساب آخر. لا يمكن ربطه بحسابين." },
          { status: 400 }
        );
      }

      // 2. توليد رمز OTP مكون من 6 أرقام
      const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = await bcrypt.hash(rawCode, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // صالح لـ 10 دقائق

      // حفظ الرمز في قاعدة البيانات
      await prisma.otpVerification.create({
        data: {
          phone,
          codeHash,
          expiresAt,
        },
      });

      // إرسال الرمز عبر WhatsApp
      const sent = await sendOtpWhatsApp(phone, rawCode);

      return NextResponse.json({
        success: true,
        message: sent
          ? "تم إرسال رمز التحقق بنجاح إلى الواتساب"
          : "تم تجهيز الرمز (وضع المحاكاة/التطوير)",
        // في وضع التطوير المحلي بدون Meta API، نعيد الرمز لتسهيل الاختبار الفوري
        devOtp: process.env.NODE_ENV === "development" || !process.env.WHATSAPP_ACCESS_TOKEN ? rawCode : undefined,
      });
    }

    if (action === "VERIFY_OTP") {
      if (!code || code.length !== 6) {
        return NextResponse.json(
          { error: "رمز التحقق يجب أن يتكون من 6 أرقام" },
          { status: 400 }
        );
      }

      // البحث عن آخر OTP ساري للرقم
      const otpRecord = await prisma.otpVerification.findFirst({
        where: {
          phone,
          isVerified: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!otpRecord) {
        return NextResponse.json(
          { error: "رمز التحقق منتهي الصلاحية أو غير موجود، برجاء طلب رمز جديد" },
          { status: 400 }
        );
      }

      // مطابقة التجزئة
      const isValid = await bcrypt.compare(code, otpRecord.codeHash);
      if (!isValid) {
        await prisma.otpVerification.update({
          where: { id: otpRecord.id },
          data: { attempts: { increment: 1 } },
        });

        return NextResponse.json(
          { error: "رمز التحقق غير صحيح، برجاء المحاولة مجدداً" },
          { status: 400 }
        );
      }

      // وسم الرمز كموثق بنجاح
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { isVerified: true },
      });

      return NextResponse.json({
        success: true,
        message: "تم التحقق من رقم الهاتف بنجاح",
      });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error: any) {
    console.error("OTP API Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
  }
}
