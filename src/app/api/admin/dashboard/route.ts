import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // 1. إحصائيات الطلاب
    const totalStudents = await prisma.user.count({ where: { role: "STUDENT" } });
    const lockedStudents = await prisma.user.count({ where: { status: "LOCKED" } });
    const activeStudents = await prisma.user.count({ where: { status: "ACTIVE", role: "STUDENT" } });

    // 2. إحصائيات الإيرادات
    const completedPurchases = await prisma.purchase.findMany({
      where: { status: "COMPLETED" },
      select: { amount: true },
    });
    const totalRevenue = completedPurchases.reduce((acc, p) => acc + Number(p.amount), 0);

    // 3. المواد الأكثر مبيعاً
    const subjects = await prisma.subject.findMany({
      include: {
        academicLevel: true,
        _count: {
          select: {
            purchases: { where: { status: "COMPLETED" } },
            lessons: true,
            exams: true,
          },
        },
      },
      orderBy: {
        purchases: { _count: "desc" },
      },
      take: 5,
    });

    // 4. آخر المدفوعات الناجحة
    const recentPayments = await prisma.purchase.findMany({
      where: { status: "COMPLETED" },
      include: {
        user: { select: { name: true, phone: true, email: true } },
        subject: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    // 5. آخر محاولات الدخول المشبوهة
    const recentAudits = await prisma.auditLog.findMany({
      include: {
        user: { select: { name: true, phone: true, email: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      stats: {
        totalStudents,
        lockedStudents,
        activeStudents,
        totalRevenue,
      },
      topSubjects: subjects,
      recentPayments,
      recentAudits,
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "فشل تحميل إحصائيات لوحة التحكم" }, { status: 500 });
  }
}
