import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { name, phone, academicLevelId, deviceFingerprint, deviceName } = body;

    // حظر ثغرة التلاعب بالحسابات: الاعتماد الحصري فقط على جلسة المصادقة الموثقة
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json(
        { error: "غير مصرح لك، يرجى تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    if (!name || !phone || !academicLevelId) {
      return NextResponse.json(
        { error: "برجاء استكمال جميع البيانات المطلوبة" },
        { status: 400 }
      );
    }

    // التحقق من أن رقم الهاتف تم تأكيده بواسطة OTP بالفعل
    const verifiedOtp = await prisma.otpVerification.findFirst({
      where: {
        phone,
        isVerified: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verifiedOtp) {
      return NextResponse.json(
        { error: "لم يتم تأكيد رقم الهاتف عبر رمز التحقق OTP" },
        { status: 400 }
      );
    }

    // التحقق من الدفعة المختارة
    const level = await prisma.academicLevel.findUnique({
      where: { id: academicLevelId },
    });

    if (!level) {
      return NextResponse.json(
        { error: "الدفعة المختارة غير صالحة" },
        { status: 400 }
      );
    }

    // تحديث بيانات المستخدم وتفعيل حسابه
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Web-Browser";

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        phone,
        phoneVerified: new Date(),
        academicLevelId,
        status: "ACTIVE",
      },
      create: {
        email,
        name,
        phone,
        phoneVerified: new Date(),
        academicLevelId,
        status: "ACTIVE",
        role: "STUDENT",
      },
    });

    // تسجيل بصمة الجهاز الأولية المعتمدة للحساب
    if (deviceFingerprint) {
      await prisma.deviceSession.upsert({
        where: {
          userId_deviceFingerprint: {
            userId: user.id,
            deviceFingerprint,
          },
        },
        update: {
          isApproved: true,
          lastActiveAt: new Date(),
        },
        create: {
          userId: user.id,
          deviceFingerprint,
          deviceName: deviceName || "جهاز الطالب الأساسي",
          ipAddress,
          userAgent,
          isApproved: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "تم تفعيل حسابك واختيار الدفعة بنجاح!",
      redirectUrl: "/student/courses",
    });
  } catch (error: any) {
    console.error("Onboarding API Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء حفظ البيانات: " + (error.message || "") },
      { status: 500 }
    );
  }
}
