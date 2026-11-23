import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      password,
      academicLevelId,
      phoneType,
      deviceFingerprint,
    } = body;

    // 1. التحقق من صحة المدخلات
    if (!name || !email || !phone || !password || !deviceFingerprint) {
      return NextResponse.json(
        { error: "يرجى استكمال جميع البيانات المطلوبة (الاسم، الجيميل، الهاتف، كلمة المرور)" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone.trim();

    // التحقق من صيغة الهاتف المصري
    const egyptianPhoneRegex = /^01[0125][0-9]{8}$/;
    if (!egyptianPhoneRegex.test(cleanPhone)) {
      return NextResponse.json(
        { error: "رقم الهاتف غير صحيح. يجب أن يكون رقم مصري يبدأ بـ 010 أو 011 أو 012 أو 015 مكون من 11 رقم." },
        { status: 400 }
      );
    }

    // 2. التحقق من عدم وجود الجيميل مسبقاً
    const existingByEmail = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingByEmail) {
      return NextResponse.json(
        { error: "هذا الجيميل مسجل بالفعل على المنصة. يرجى تسجيل الدخول مباشرة." },
        { status: 400 }
      );
    }

    // 3. التحقق من عدم وجود الهاتف مسبقاً
    const existingByPhone = await prisma.user.findUnique({
      where: { phone: cleanPhone },
    });
    if (existingByPhone) {
      return NextResponse.json(
        { error: "رقم الهاتف هذا مسجل بالفعل لطالب آخر. الحساب مرتبط برقم هاتف واحد فقط." },
        { status: 400 }
      );
    }

    // 4. استخراج عنوان الـ IP والـ User Agent
    const forwarded = req.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "متصفح غير معروف";
    const detectedPhoneType = phoneType?.trim() || "هاتف محمول";

    // 5. تشفير كلمة المرور
    const passwordHash = await bcrypt.hash(password, 10);

    // 6. إنشاء حساب الطالب وتخزين الجيميل ونوع الفون وبصمة العتاد بشكل دائم
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        initialEmail: cleanEmail,
        phone: cleanPhone,
        initialPhone: cleanPhone,
        phoneType: detectedPhoneType,
        initialFingerprint: deviceFingerprint,
        passwordHash,
        academicLevelId: academicLevelId || null,
        role: "STUDENT",
        status: "ACTIVE",
        emailVerified: new Date(),
        phoneVerified: new Date(),
        devices: {
          create: {
            deviceFingerprint,
            deviceName: detectedPhoneType,
            deviceModel: detectedPhoneType,
            ipAddress,
            userAgent,
            isApproved: true,
            lastActiveAt: new Date(),
          },
        },
      },
    });

    // 7. توثيق عملية التسجيل وحفظ نوع الجهاز في سجل التدقيق (AuditLog)
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ACCOUNT_REGISTERED",
        attemptedEmail: cleanEmail,
        attemptedPhone: cleanPhone,
        attemptedFingerprint: deviceFingerprint,
        attemptedDeviceModel: detectedPhoneType,
        ipAddress,
        userAgent,
        reason: `تسجيل حساب جديد - تم توثيق وحفظ نوع الفون (${detectedPhoneType}) والجيميل الأصلي (${cleanEmail}) ورقم الهاتف (${cleanPhone})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم إنشاء الحساب بنجاح وربط بيانات الفون والجيميل الخاصة بك",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        phoneType: user.phoneType,
      },
    });
  } catch (err: any) {
    console.error("Register API Error:", err);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع أثناء تسجيل الحساب. يرجى المحاولة لاحقاً." },
      { status: 500 }
    );
  }
}
