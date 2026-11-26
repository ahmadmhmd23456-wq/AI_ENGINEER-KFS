import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const levels = await prisma.academicLevel.findMany({
      orderBy: { order: "asc" },
      include: {
        subjects: {
          where: { isActive: true },
          orderBy: [{ order: "asc" }, { term: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            name: true,
            code: true,
            term: true,
            department: true,
            price: true,
            _count: {
              select: {
                lessons: true,
                exams: true,
              },
            },
          },
        },
        _count: {
          select: { subjects: true },
        },
      },
    });

    return NextResponse.json(levels);
  } catch (error) {
    console.error("Levels GET Error:", error);
    return NextResponse.json({ error: "فشل تحميل الدفعات" }, { status: 500 });
  }
}
