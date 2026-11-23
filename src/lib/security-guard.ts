import prisma from "./prisma";
import { sendWhatsAppAlertToAdmin } from "./whatsapp";

export interface SecurityCheckInput {
  email: string;
  phone?: string;
  deviceFingerprint: string;
  deviceName?: string;
  ipAddress: string;
  userAgent: string;
}

export interface SecurityCheckResult {
  allowed: boolean;
  isLocked: boolean;
  reason?: string;
  user?: any;
}

/**
 * محرك الأمان والربط الثلاثي:
 * يتحقق من (Google Email/ID + رقم الهاتف + بصمة الجهاز).
 * في حالة وجود أي تضارب أو محاولة دخول مشبوهة، يتم قفل الحساب فوراً وإرسال تنبيه عاجل للأدمن.
 */
export async function verifyLoginSecurity(input: SecurityCheckInput): Promise<SecurityCheckResult> {
  const { email, phone, deviceFingerprint, deviceName, ipAddress, userAgent } = input;

  // 1. البحث عن المستخدم بالبريد الإلكتروني
  let user = await prisma.user.findUnique({
    where: { email },
    include: {
      devices: true,
      academicLevel: true,
    },
  });

  // 2. إذا كان الحساب غير موجود بالبريد، لكن تم تمرير رقم هاتف: نفحص هل الرقم مرتبط بحساب Google آخر؟
  if (!user && phone) {
    const existingUserWithPhone = await prisma.user.findUnique({
      where: { phone },
      include: { devices: true },
    });

    if (existingUserWithPhone) {
      // ⚠️ خرق أمني خطير: شخص يحاول استخدام نفس رقم الهاتف مع حساب Google مختلف!
      await lockAccountAndAlertAdmin({
        user: existingUserWithPhone,
        reason: "محاولة دخول بنفس رقم الهاتف المسجل من حساب Google مختلف!",
        attemptedEmail: email,
        attemptedFingerprint: deviceFingerprint,
        ipAddress,
        userAgent,
      });

      return {
        allowed: false,
        isLocked: true,
        reason: "تم إيقاف الحساب فوراً بسبب محاولة ربط برقم مسجل بحساب Google آخر.",
      };
    }
  }

  // 3. إذا كان المستخدم غير مسجل بعد (تسجيل جديد Onboarding)
  if (!user) {
    return {
      allowed: true,
      isLocked: false,
      user: null,
    };
  }

  // 4. إذا كان الحساب مقفولاً بالفعل
  if (user.status === "LOCKED") {
    // تسجيل محاولة دخول لحساب محظور
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "BLOCKED_LOGIN_ATTEMPT",
        attemptedEmail: email,
        attemptedFingerprint: deviceFingerprint,
        ipAddress,
        userAgent,
        reason: "محاولة دخول بحساب محظور حالياً (LOCKED)",
      },
    });

    return {
      allowed: false,
      isLocked: true,
      reason: "تم إيقاف حسابك من قبل الإدارة. يرجى التواصل مع الدعم الفني.",
      user,
    };
  }

  // إذا كان الأدمن، يُسمح له بالدخول من أي جهاز مصرح
  if (user.role === "ADMIN") {
    return {
      allowed: true,
      isLocked: false,
      user,
    };
  }

  // 5. فحص بصمة الجهاز (Device Fingerprint) للطالب
  const approvedDevice = user.devices.find((d) => d.deviceFingerprint === deviceFingerprint);

  if (!approvedDevice) {
    // الجهاز غير مسجل للطالب
    const approvedDevicesCount = user.devices.filter((d) => d.isApproved).length;

    // إذا تجاوز الحد الأقصى للأجهزة المصرح بها (الافتراضي: جهاز واحد)
    if (approvedDevicesCount >= user.maxAllowedDevices) {
      // ⚠️ خرق أمني: محاولة دخول من جهاز جديد غير مصرح
      await lockAccountAndAlertAdmin({
        user,
        reason: `محاولة دخول من جهاز جديد غير مصرح به (${deviceName || userAgent.substring(0, 30)}) تجاوز الحد الأقصى المسموح (${user.maxAllowedDevices}).`,
        attemptedEmail: email,
        attemptedFingerprint: deviceFingerprint,
        ipAddress,
        userAgent,
      });

      return {
        allowed: false,
        isLocked: true,
        reason: "تم قفل الحساب: تم رصد محاولة دخول من جهاز جديد غير مصرح به.",
        user,
      };
    } else {
      // تسجيل الجهاز الجديد إذا كان الحساب في مرحلة الإعداد أو لم يتجاوز الحد
      await prisma.deviceSession.create({
        data: {
          userId: user.id,
          deviceFingerprint,
          deviceName: deviceName || "متصفح الويب",
          ipAddress,
          userAgent,
          isApproved: true,
          lastActiveAt: new Date(),
        },
      });
    }
  } else {
    // تحديث وقت آخر نشاط للجهاز
    await prisma.deviceSession.update({
      where: { id: approvedDevice.id },
      data: {
        lastActiveAt: new Date(),
        ipAddress,
      },
    });
  }

  return {
    allowed: true,
    isLocked: false,
    user,
  };
}

/**
 * قفل الحساب فوراً وإرسال إشعار عاجل للأدمن (واتساب + لوحة التحكم + AuditLog)
 */
export async function lockAccountAndAlertAdmin(params: {
  user: any;
  reason: string;
  attemptedEmail?: string;
  attemptedFingerprint?: string;
  ipAddress: string;
  userAgent: string;
}) {
  const { user, reason, attemptedEmail, attemptedFingerprint, ipAddress, userAgent } = params;

  // 1. قفل الحساب فوراً في قاعدة البيانات
  await prisma.user.update({
    where: { id: user.id },
    data: { status: "LOCKED" },
  });

  // 2. تدوين الواقعة في سجل التدقيق الأمني (AuditLog)
  const audit = await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "ACCOUNT_LOCKED",
      attemptedEmail: attemptedEmail || user.email,
      attemptedPhone: user.phone,
      attemptedFingerprint,
      ipAddress,
      userAgent,
      reason,
    },
  });

  // 3. إنشاء إشعار داخلي في لوحة الأدمن
  await prisma.notification.create({
    data: {
      userId: user.id,
      channel: "IN_APP",
      type: "SECURITY_ALERT",
      title: "🚨 تنبيه أمني عاجل: تم قفل حساب طالب",
      body: `تم إيقاف حساب الطالب: ${user.name} (رقم: ${user.phone}) بسبب: ${reason}`,
      status: "SENT",
    },
  });

  // 4. إرسال رسالة واتساب فورية إلى هاتف الأدمن المباشر
  const adminPhone = process.env.ADMIN_PHONE || "01012345678";
  const alertMessage = `🚨 *تنبيه أمني عاجل - تم إيقاف حساب طالب!*
👤 *اسم الطالب:* ${user.name}
📱 *رقم الهاتف:* ${user.phone || "غير مسجل"}
📧 *الجيميل الأصلي:* ${user.email}
⚠️ *الجيميل المشبوه المحاول:* ${attemptedEmail || "نفسه"}
💻 *بصمة الجهاز:* ${attemptedFingerprint ? attemptedFingerprint.substring(0, 16) + "..." : "غير معروفة"}
🌐 *عنوان الـ IP:* ${ipAddress}
⏰ *الوقت:* ${new Date().toLocaleString("ar-EG")}
📝 *السبب:* ${reason}

يمكنك مراجعة وفك الحظر من لوحة تحكم الأدمن:
${process.env.NEXTAUTH_URL || "http://localhost:3000"}/admin/locked-accounts`;

  try {
    await sendWhatsAppAlertToAdmin(adminPhone, alertMessage);
  } catch (err) {
    console.error("فشل إرسال إشعار الواتساب للأدمن:", err);
  }

  return audit;
}

/**
 * فك الحظر بواسطة الأدمن مع تسجيل الملاحظات وتحديد الإجراء
 */
export async function unlockStudentAccount(params: {
  userId: string;
  adminId: string;
  adminNotes: string;
  actionType: "UNLOCK_ONLY" | "CHANGE_EMAIL" | "AUTHORIZE_NEW_DEVICE" | "RESET_ALL_DEVICES";
  newEmail?: string;
  newDeviceFingerprint?: string;
}) {
  const { userId, adminId, adminNotes, actionType, newEmail, newDeviceFingerprint } = params;

  const updateData: any = {
    status: "ACTIVE",
  };

  if (actionType === "CHANGE_EMAIL" && newEmail) {
    updateData.email = newEmail;
  }

  // تطبيق فك الحظر
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  // إدارة الأجهزة
  if (actionType === "RESET_ALL_DEVICES") {
    await prisma.deviceSession.deleteMany({
      where: { userId },
    });
  } else if (actionType === "AUTHORIZE_NEW_DEVICE" && newDeviceFingerprint) {
    await prisma.deviceSession.upsert({
      where: {
        userId_deviceFingerprint: {
          userId,
          deviceFingerprint: newDeviceFingerprint,
        },
      },
      update: { isApproved: true },
      create: {
        userId,
        deviceFingerprint: newDeviceFingerprint,
        deviceName: "جهاز مصرح به يدوياً من الأدمن",
        ipAddress: "Admin-Approved",
        userAgent: "Manual Approval",
        isApproved: true,
      },
    });
  }

  // توثيق فك الحظر في الـ AuditLog
  await prisma.auditLog.create({
    data: {
      userId,
      action: "MANUAL_UNLOCK",
      reason: `تم فك الحظر بواسطة الأدمن. الإجراء: ${actionType}`,
      adminNotes,
      resolvedByUserId: adminId,
      resolvedAt: new Date(),
      ipAddress: "Admin-Panel",
      userAgent: "Admin-Panel",
    },
  });

  return updatedUser;
}
