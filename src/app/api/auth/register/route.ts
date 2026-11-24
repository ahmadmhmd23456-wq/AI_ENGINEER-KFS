import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { normalizeEgyptianPhone } from "@/lib/arabic-search";

// التحقق من صيغة الهاتف المصري: 010, 011, 012, 015
const EGYPT_PHONE_REGEX = /^01[0125][0-9]{8}$/;

// التحقق من صيغة البريد الإلكتروني
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// قائمة بأدوات الاختراق والفحص والـ Bots المحظورة
const SUSPICIOUS_AGENTS = [
  "manus-user",
  "curl",
  "python",
  "postman",
  "headless",
  "phantom",
  "scrapy",
  "axios",
  "go-http-client",
  "node-fetch",
  "aiohttp",
  "sqlmap",
  "nikto",
];

// أرقام هواتف وهمية محظورة
const DUMMY_PHONES = [
  "01000000000",
  "01111111111",
  "01222222222",
  "01555555555",
  "01012345678",
  "01234567890",
  "01505854513",
];

// قائمة بالحسابات المحظورة أمنياً
const BANNED_EMAILS = [
  "ansmarh151@gmail.com",
  "ansmarh55@gmail.com",
  "ansomaraai@gmail.com",
];

// ذاكرة مؤقتة لتقييد معدل طلبات التسجيل (Rate Limiter: حد أقصى 4 حسابات لكل IP كل 15 دقيقة)
const registrationAttempts = new Map<string, { count: number; resetAt: number }>();

// تنظيف المدخلات من أي أكواد خبيثة (Sanitization)
function sanitizeText(input: string): string {
  return input
    .replace(/[<>]/g, "") // إزالة وسوم HTML لمنع XSS
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "متصفح غير معروف";
    const lowerAgent = userAgent.toLowerCase();

    // 1. حظر أدوات الاختراق والفحص الآلي (Bot Blocker)
    const isBot = SUSPICIOUS_AGENTS.some((b) => lowerAgent.includes(b));
    if (isBot) {
      await prisma.auditLog.create({
        data: {
          action: "BOT_ATTACK_BLOCKED",
          ipAddress,
          userAgent,
          reason: `تم حظر أداة فحص أو روبوت مشبوه: ${userAgent}`,
        },
      });
      return NextResponse.json(
        { error: "طلب مرفوض: تم اكتشاف استخدام أدوات أتمتة أو فحص غير مصرحة." },
        { status: 403 }
      );
    }

    const body = await req.json();

    // 2. فحص حقل المصيدة (Honeypot) - إذا تم ملؤه بواسطة روبوت يتم الرفض
    if (body.website || body.company || body.url) {
      return NextResponse.json(
        { error: "تم رفض الطلب بواسطة نظام الحماية." },
        { status: 400 }
      );
    }

    // 3. تقييد معدل الطلبات حسب الـ IP لمنع هجمات الإغراق
    const now = Date.now();
    const rateData = registrationAttempts.get(ipAddress);
    if (rateData && now < rateData.resetAt) {
      if (rateData.count >= 4) {
        return NextResponse.json(
          { error: "تم تجاوز الحد المسموح به لإنشاء الحسابات من هذا الجهاز. يرجى الانتظار 15 دقيقة." },
          { status: 429 }
        );
      }
      rateData.count++;
    } else {
      registrationAttempts.set(ipAddress, { count: 1, resetAt: now + 15 * 60 * 1000 });
    }

    const {
      name,
      email,
      phone,
      password,
      academicLevelId,
      phoneType,
      deviceFingerprint,
    } = body;

    // 1. التحقق من وجود الحقول الإلزامية
    if (!name || !email || !phone || !password || !deviceFingerprint) {
      return NextResponse.json(
        {
          error:
            "يرجى استكمال جميع البيانات المطلوبة (الاسم، الجيميل، الهاتف، كلمة المرور)",
        },
        { status: 400 }
      );
    }

    const cleanName = sanitizeText(name);
    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = normalizeEgyptianPhone(phone);
    const cleanPhoneType = sanitizeText(phoneType || "هاتف محمول");
    const cleanFingerprint = sanitizeText(deviceFingerprint);

    // التحقق من طول الاسم
    if (cleanName.length < 3 || cleanName.length > 80) {
      return NextResponse.json(
        { error: "الاسم يجب أن يكون بين 3 و 80 حرفاً." },
        { status: 400 }
      );
    }

    // التحقق من صحة البريد الإلكتروني
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json(
        { error: "صيغة البريد الإلكتروني غير صحيحة." },
        { status: 400 }
      );
    }

    // فحص القائمة السوداء للحسابات المحظورة
    if (BANNED_EMAILS.includes(cleanEmail)) {
      return NextResponse.json(
        { error: "هذا الحساب محظور أمنياً من التسجيل على المنصة." },
        { status: 403 }
      );
    }

    // التحقق من صيغة الهاتف المصري
    if (!EGYPT_PHONE_REGEX.test(cleanPhone)) {
      return NextResponse.json(
        {
          error:
            "رقم الهاتف غير صحيح. يجب أن يكون رقم مصري يبدأ بـ 010 أو 011 أو 012 أو 015 مكون من 11 رقم.",
        },
        { status: 400 }
      );
    }

    // حظر الأرقام الوهمية والمتكررة
    if (DUMMY_PHONES.includes(cleanPhone)) {
      return NextResponse.json(
        { error: "يرجى إدخال رقم هاتف حقيقي وخاص بك لضمان حماية حسابك." },
        { status: 400 }
      );
    }

    // التحقق من قوة كلمة المرور (على الأقل 8 أحرف)
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "كلمة المرور يجب ألا تقل عن 8 أحرف وأرقام لضمان أمان حسابك." },
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
        {
          error:
            "رقم الهاتف هذا مسجل بالفعل لطالب آخر. الحساب مرتبط برقم هاتف واحد فقط.",
        },
        { status: 400 }
      );
    }

    // 4. تشفير كلمة المرور بـ Salt قوي (12 جولة bcrypt)
    const passwordHash = await bcrypt.hash(password, 12);

    // 6. إنشاء حساب الطالب
    const user = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        initialEmail: cleanEmail,
        phone: cleanPhone,
        initialPhone: cleanPhone,
        phoneType: cleanPhoneType,
        initialFingerprint: cleanFingerprint,
        passwordHash,
        academicLevelId: academicLevelId || null,
        role: "STUDENT",
        status: "ACTIVE",
        emailVerified: new Date(),
        phoneVerified: new Date(),
        devices: {
          create: {
            deviceFingerprint: cleanFingerprint,
            deviceName: cleanPhoneType,
            deviceModel: cleanPhoneType,
            ipAddress,
            userAgent,
            isApproved: true,
            lastActiveAt: new Date(),
          },
        },
      },
    });

    // 7. توثيق عملية التسجيل دون تخزين كلمات المرور
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "STUDENT_REGISTRATION",
        attemptedEmail: cleanEmail,
        attemptedPhone: cleanPhone,
        attemptedFingerprint: cleanFingerprint,
        attemptedDeviceModel: cleanPhoneType,
        ipAddress,
        userAgent,
        reason: "تسجيل حساب طالب جديد بنجاح",
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم إنشاء الحساب بنجاح",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error: any) {
    console.error("Registration POST Error:", error?.message || error);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع أثناء معالجة طلب التسجيل." },
      { status: 500 }
    );
  }
}
