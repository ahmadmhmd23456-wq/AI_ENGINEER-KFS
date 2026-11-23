import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const purchases = await prisma.purchase.findMany({
      where: { userId },
      include: {
        subject: {
          select: { name: true, code: true, term: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(purchases);
  } catch (error) {
    console.error("Student Purchases GET Error:", error);
    return NextResponse.json({ error: "فشل تحميل سجل المدفوعات" }, { status: 500 });
  }
}
