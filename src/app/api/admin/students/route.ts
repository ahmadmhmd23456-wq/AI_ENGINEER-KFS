import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const levelId = searchParams.get("levelId") || "";
    const status = searchParams.get("status") || "";

    const where: any = { role: "STUDENT" };
    if (levelId) where.academicLevelId = levelId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const students = await prisma.user.findMany({
      where,
      include: {
        academicLevel: true,
        devices: true,
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

    return NextResponse.json({ students, levels });
  } catch (error) {
    console.error("Admin Students GET Error:", error);
    return NextResponse.json({ error: "فشل تحميل قائمة الطلاب" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, action, newEmail, academicLevelId } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: "البيانات ناقصة" }, { status: 400 });
    }

    if (action === "CHANGE_EMAIL" && newEmail) {
      await prisma.user.update({
        where: { id: userId },
        data: { email: newEmail.toLowerCase().trim() },
      });
    } else if (action === "TOGGLE_LOCK") {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const newStatus = user?.status === "LOCKED" ? "ACTIVE" : "LOCKED";
      await prisma.user.update({
        where: { id: userId },
        data: { status: newStatus },
      });
    } else if (action === "CHANGE_LEVEL" && academicLevelId) {
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
