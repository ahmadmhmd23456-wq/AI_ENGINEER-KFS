import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions, isPlatformAdmin } from "@/lib/auth";
import { sendWhatsAppAlertToAdmin } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const reasonText = String(body.reason || "محاولة تسجيل شاشة أو تصوير المحاضرة").slice(0, 250);
    const videoTitle = String(body.videoTitle || "").slice(0, 150);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, role: true, status: true },
    });

    if (!user) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // حماية الأدمن: لا يتم حظر حساب الأدمن الرئيسي أبداً أثناء الاختبار
    if (user.role === "ADMIN" || isPlatformAdmin(user.email)) {
      return NextResponse.json({
        success: true,
        banned: false,
        isAdminTest: true,
        message: "تم رصد محاولة التصوير (وضع اختبار الأدمن بدون حظر).",
      });
    }

    const fullReason = videoTitle
      ? `${reasonText} (المحاضرة: ${videoTitle})`
      : reasonText;

    // حظر الحساب فوراً في قاعدة البيانات
    await prisma.user.update({
      where: { id: user.id },
      data: { status: "LOCKED" },
    });

    // تسجيل الواقعة في سجل الأمان ليظهر في لوحة الأدمن (الحسابات المحظورة)
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ACCOUNT_LOCKED",
        attemptedEmail: user.email,
        attemptedPhone: user.phone,
        ipAddress,
        userAgent,
        reason: `🚫 حظر تلقائي (تصوير/تسجيل المحاضرة): ${fullReason}`,
      },
    });

    // إشعار فوري للأدمن عبر الواتساب
    const adminPhone = process.env.ADMIN_PHONE || "01065375309";
    if (adminPhone) {
      await sendWhatsAppAlertToAdmin(
        adminPhone,
        `🚨 *تنبيه أمني: حظر طالب حاول تصوير/تسجيل محاضرة!*\n👤 الطالب: ${user.name}\n📱 الهاتف: ${
          user.phone || "غير مسجل"
        }\n📧 الإيميل: ${user.email}\n⚠️ السبب: ${fullReason}`
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      banned: true,
      redirectUrl: "/locked",
      message: "تم حظر حسابك فوراً لمحاولة تصوير أو تسجيل المحاضرة المحمية.",
    });
  } catch (error) {
    console.error("Capture Ban API Error:", error);
    return NextResponse.json({ error: "فشل تنفيذ إجراء الحماية" }, { status: 500 });
  }
}
