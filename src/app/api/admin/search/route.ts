import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { buildStudentSearchQuery } from "@/lib/arabic-search";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const levelId = searchParams.get("levelId") || "";
    const department = searchParams.get("department") || "";
    const status = searchParams.get("status") || "";
    const deviceType = (searchParams.get("deviceType") || "").trim();
    const hasPurchases = searchParams.get("hasPurchases") || "";

    const where: any = { role: "STUDENT" };

    if (levelId && levelId !== "ALL") {
      where.academicLevelId = levelId;
    }

    if (department && department !== "ALL") {
      where.department = department;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (deviceType) {
      where.OR = [
        { phoneType: { contains: deviceType, mode: "insensitive" } },
        {
          devices: {
            some: {
              deviceModel: { contains: deviceType, mode: "insensitive" },
            },
          },
        },
      ];
    }

    // البحث الذكي باللغة العربية مع مراعاة الهمزات وتعدد الكلمات
    if (q) {
      const searchQuery = buildStudentSearchQuery(q);
      Object.assign(where, searchQuery);
    }

    if (hasPurchases === "true") {
      where.purchases = { some: { status: "COMPLETED" } };
    } else if (hasPurchases === "false") {
      where.purchases = { none: { status: "COMPLETED" } };
    }

    const [students, totalCount, levels, subjects, statsTotal, statsLocked] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          academicLevel: true,
          devices: {
            orderBy: { lastActiveAt: "desc" },
          },
          purchases: {
            where: { status: "COMPLETED" },
            include: {
              subject: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  price: true,
                  department: true,
                },
              },
            },
          },
          _count: {
            select: {
              devices: true,
              purchases: { where: { status: "COMPLETED" } },
              examAttempts: true,
              auditLogs: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100, // حد أقصى 100 نتيجة للسرعة الفائقة
      }),
      prisma.user.count({ where }),
      prisma.academicLevel.findMany({ orderBy: { order: "asc" } }),
      prisma.subject.findMany({
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
        orderBy: [{ term: "asc" }, { order: "asc" }],
      }),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { role: "STUDENT", status: "LOCKED" } }),
    ]);

    return NextResponse.json({
      students,
      totalCount,
      levels,
      subjects,
      stats: {
        totalStudents: statsTotal,
        totalLocked: statsLocked,
        totalActive: statsTotal - statsLocked,
      },
    });
  } catch (error: any) {
    console.error("Admin Search GET Error:", error);
    return NextResponse.json({ error: "فشل تنفيذ البحث" }, { status: 500 });
  }
}
