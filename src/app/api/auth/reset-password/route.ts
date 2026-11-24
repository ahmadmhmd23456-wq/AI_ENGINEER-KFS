import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendOtpWhatsApp } from "@/lib/whatsapp";
import { checkLoginRateLimit, recordFailedLogin, recordSuccessfulLogin } from "@/lib/rate-limiter";

const EGYPT_PHONE_REGEX = /^01[0125][0-9]{8}$/;

export async function POST(req: NextRequest) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

    const body = await req.json();
    const { action, phone, code, newPassword } = body;

    if (!phone || !EGYPT_PHONE_REGEX.test(phone.trim())) {
      return NextResponse.json(
        { error: "برجاء إدخال رقم هاتف مصري صحيح يبدأ بـ 01 (11 رقماً)" },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim();

    // فحص حظر الـ Rate Limiter
    const rateCheck = checkLoginRateLimit(cleanPhone, ipAddress);
    if (rateCheck.isBlocked) {
      return NextResponse.json(
        { error: `تم حظر المحاولات مؤقتاً. يرجى الانتظار ${rateCheck.waitSeconds} ثانية.` },
        { status: 429 }
      );
    }

    // 1. طلب رمز استعادة كلمة المرور
    if (action === "REQUEST_RESET") {
      const user = await prisma.user.findFirst({
        where: { phone: cleanPhone },
      });

      // رسالة آمنة عامة لا تؤكد أو تنفي وجود الحساب لمنع فحص المستخدمين
      if (!user) {
        // تأخير زمني محايد لمنع Timing Attacks
        await new Promise((r) => setTimeout(r, 600));
        return NextResponse.json({
          success: true,
          message: "إذا كان الرقم مسجلاً، فقد تم إرسال رمز التحقق بنجاح.",
        });
      }

      // توليد رمز مكون من 6 أرقام
      const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = await bcrypt.hash(rawCode, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 دقائق

      await prisma.otpVerification.create({
        data: {
          phone: cleanPhone,
          codeHash,
          expiresAt,
        },
      });

      await sendOtpWhatsApp(cleanPhone, rawCode);

      return NextResponse.json({
        success: true,
        message: "تم إرسال رمز التحقق بنجاح إلى هاتفك المسجل.",
      });
    }

    // 2. التحقق من الرمز وتعيين كلمة المرور الجديدة
    if (action === "CONFIRM_RESET") {
      if (!code || code.length !== 6) {
        return NextResponse.json({ error: "رمز التحقق يجب أن يتكون من 6 أرقام." }, { status: 400 });
      }

      if (!newPassword || newPassword.length < 8) {
        return NextResponse.json(
          { error: "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف وأرقام." },
          { status: 400 }
        );
      }

      const otpRecord = await prisma.otpVerification.findFirst({
        where: {
          phone: cleanPhone,
          isVerified: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!otpRecord) {
        await recordFailedLogin(cleanPhone, ipAddress);
        return NextResponse.json(
          { error: "رمز التحقق منتهي الصلاحية أو غير موجود، يرجى طلب رمز جديد." },
          { status: 400 }
        );
      }

      const isCodeValid = await bcrypt.compare(code.trim(), otpRecord.codeHash);
      if (!isCodeValid) {
        await recordFailedLogin(cleanPhone, ipAddress);
        await prisma.otpVerification.update({
          where: { id: otpRecord.id },
          data: { attempts: { increment: 1 } },
        });
        return NextResponse.json({ error: "رمز التحقق غير صحيح، يرجى المحاولة مجدداً." }, { status: 400 });
      }

      // وسم الـ OTP كمستخدم
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { isVerified: true },
      });

      // تشفير كلمة المرور بـ 12 جولة bcrypt
      const passwordHash = await bcrypt.hash(newPassword, 12);

      await prisma.user.updateMany({
        where: { phone: cleanPhone },
        data: { passwordHash },
      });

      recordSuccessfulLogin(cleanPhone, ipAddress);

      return NextResponse.json({
        success: true,
        message: "تم تغيير كلمة المرور بنجاح.",
      });
    }

    return NextResponse.json({ error: "إجراء غير مدعوم." }, { status: 400 });
  } catch (error: any) {
    console.error("Reset Password Error:", error?.message || error);
    return NextResponse.json({ error: "فشل معالجة طلب استعادة كلمة المرور." }, { status: 500 });
  }
}
