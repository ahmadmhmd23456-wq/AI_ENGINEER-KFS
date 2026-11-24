import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const count = await prisma.user.count({
      where: { status: "LOCKED" },
    });
    return NextResponse.json({ count });
  } catch (err) {
    return NextResponse.json({ count: 0 });
  }
}
