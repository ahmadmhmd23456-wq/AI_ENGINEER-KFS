import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { unlockStudentAccount } from "@/lib/security-guard";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

// جلب قائمة الحسابات المقفولة وسجلاتها الأمنية
export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const lockedUsers = await prisma.user.findMany({
      where: { status: "LOCKED" },
      include: {
        academicLevel: true,
        devices: true,
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(lockedUsers);
  } catch (error) {
    console.error("Locked Accounts GET Error:", error);
    return NextResponse.json({ error: "فشل تحميل الحسابات المقفولة" }, { status: 500 });
  }
}

// تنفيذ فك الحظر بواسطة الأدمن
export async function POST(req: NextRequest) {
  try {
    const { error, user: adminSession } = await requireAdmin();
    if (error) return error;

    const body = await req.json();
    const { userId, adminNotes, actionType, newEmail, newDeviceFingerprint } = body;

    if (!userId || !adminNotes) {
      return NextResponse.json(
        { error: "برجاء تحديد الطالب وكتابة ملاحظات سبب فك الحظر" },
        { status: 400 }
      );
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: adminSession?.id },
    });

    const adminId = adminSession?.id || adminUser?.id || "admin_system";

    // تنفيذ فك الحظر الأمني وتسجيل الإجراء
    const updatedUser = await unlockStudentAccount({
      userId,
      adminId,
      adminNotes,
      actionType: actionType || "UNLOCK_ONLY",
      newEmail,
      newDeviceFingerprint,
    });

    // إرسال رسالة واتساب للطالب لإبلاغه بفك الحظر
    if (updatedUser.phone) {
      const msg = `أهلاً يا بشمهندس ${updatedUser.name} 👋
تمت مراجعة حسابك بواسطة الأستاذ وفك الحظر بنجاح! 🎉
يمكنك الآن تسجيل الدخول والمتابعة بشكل طبيعي. بالتوفيق.`;
      try {
        await sendWhatsAppMessage(updatedUser.phone, msg);
      } catch (e) {
        console.error("فشل إرسال إشعار فك الحظر:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message: "تم فك الحظر وتوثيق الإجراء بنجاح",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Unlock POST Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء فك الحظر: " + (error.message || "") },
      { status: 500 }
    );
  }
}
