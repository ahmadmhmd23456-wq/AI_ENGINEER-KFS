import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { buildStudentSearchQuery } from "@/lib/arabic-search";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const levelId = searchParams.get("levelId") || "";
    const status = searchParams.get("status") || "";

    const where: any = { role: "STUDENT" };
    if (levelId) where.academicLevelId = levelId;
    if (status) where.status = status;
    if (search) {
      const searchQuery = buildStudentSearchQuery(search);
      Object.assign(where, searchQuery);
    }

    const students = await prisma.user.findMany({
      where,
      include: {
        academicLevel: true,
        devices: {
          orderBy: { lastActiveAt: "desc" },
        },
        purchases: {
          where: { status: "COMPLETED" },
          select: {
            id: true,
            subjectId: true,
            amount: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            purchases: { where: { status: "COMPLETED" } },
            examAttempts: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const levels = await prisma.academicLevel.findMany({
      orderBy: { order: "asc" },
    });

    const subjects = await prisma.subject.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        price: true,
        academicLevelId: true,
        department: true,
        term: true,
      },
      orderBy: [
        { term: "asc" },
        { order: "asc" },
      ],
    });

    return NextResponse.json({ students, levels, subjects });
  } catch (error) {
    console.error("Admin Students GET Error:", error);
    return NextResponse.json({ error: "فشل تحميل قائمة الطلاب" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await req.json();
    const {
      userId,
      action,
      newEmail,
      newPassword,
      academicLevelId,
      subjectId,
      grant,
      deviceId,
      maxAllowedDevices,
    } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: "البيانات ناقصة" }, { status: 400 });
    }

    // 1. فتح أو إغلاق مادة للطالب (شحن يدوي)
    if (action === "TOGGLE_SUBJECT" && subjectId) {
      if (grant) {
        const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
        await prisma.purchase.upsert({
          where: {
            userId_subjectId: { userId, subjectId },
          },
          update: {
            status: "COMPLETED",
            paymentMethod: "MANUAL_GRANT",
            paymentGateway: "MANUAL",
            adminNotes: "شحن وفتح يدوي من لوحة الأدمن",
          },
          create: {
            userId,
            subjectId,
            amount: subject?.price || 0,
            status: "COMPLETED",
            paymentMethod: "MANUAL_GRANT",
            paymentGateway: "MANUAL",
            transactionId: `MANUAL_${Date.now()}`,
            adminNotes: "شحن وفتح يدوي من لوحة الأدمن",
          },
        });
        return NextResponse.json({ success: true, message: "تم فتح وتفعيل المادة للطالب بنجاح!" });
      } else {
        await prisma.purchase.deleteMany({
          where: { userId, subjectId },
        });
        return NextResponse.json({ success: true, message: "تم قفل المادة عن الطالب بنجاح!" });
      }
    }

    // 2. حذف جهاز محدد لطالب (Unbind Device)
    if (action === "DELETE_DEVICE" && deviceId) {
      await prisma.deviceSession.delete({
        where: { id: deviceId },
      });
      return NextResponse.json({ success: true, message: "تم إزالة الجهاز بنجاح ويمكن للطالب ربط جهاز جديد" });
    }

    // 3. إعادة ضبط كامل أجهزة وبصمات الطالب (Reset All Devices)
    if (action === "RESET_ALL_DEVICES") {
      await prisma.deviceSession.deleteMany({
        where: { userId },
      });
      await prisma.user.update({
        where: { id: userId },
        data: {
          phoneType: null,
          initialFingerprint: null,
          status: "ACTIVE", // فك الحظر إن كان مقفولاً بسبب تعارض الأجهزة
        },
      });
      return NextResponse.json({
        success: true,
        message: "تم مسح جميع الأجهزة وفك الحظر بنجاح، الجهاز القادم سيتم ربطه تلقائياً كجهازه الأساسي.",
      });
    }

    // 4. تعديل الحد الأقصى للأجهزة المسموح بها للطالب
    if (action === "UPDATE_MAX_DEVICES" && maxAllowedDevices) {
      const num = parseInt(maxAllowedDevices, 10);
      if (isNaN(num) || num < 1 || num > 5) {
        return NextResponse.json({ error: "عدد الأجهزة يجب أن يكون بين 1 و 5" }, { status: 400 });
      }
      await prisma.user.update({
        where: { id: userId },
        data: { maxAllowedDevices: num },
      });
      return NextResponse.json({ success: true, message: `تم تحديث الحد الأقصى للأجهزة إلى (${num})` });
    }

    // 5. تعديل البريد الإلكتروني
    if (action === "CHANGE_EMAIL" && newEmail) {
      await prisma.user.update({
        where: { id: userId },
        data: { email: newEmail.toLowerCase().trim() },
      });
    }
    // 6. تعيين كلمة مرور جديدة للطالب
    else if (action === "RESET_PASSWORD" && newPassword) {
      if (typeof newPassword !== "string" || newPassword.length < 6) {
        return NextResponse.json({ error: "كلمة المرور يجب ألا تقل عن 6 أحرف" }, { status: 400 });
      }
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
      return NextResponse.json({ success: true, message: "تم تعيين كلمة المرور الجديدة للطالب بنجاح!" });
    }
    // 7. قفل أو فك حظر الحساب
    else if (action === "TOGGLE_LOCK") {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const newStatus = user?.status === "LOCKED" ? "ACTIVE" : "LOCKED";
      await prisma.user.update({
        where: { id: userId },
        data: { status: newStatus },
      });
    }
    // 7. تغيير الدفعة الأكاديمية
    else if (action === "CHANGE_LEVEL" && academicLevelId) {
      await prisma.user.update({
        where: { id: userId },
        data: { academicLevelId },
      });
    }

    return NextResponse.json({ success: true, message: "تم تحديث بيانات الطالب بنجاح" });
  } catch (error: any) {
    console.error("Admin Students POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
