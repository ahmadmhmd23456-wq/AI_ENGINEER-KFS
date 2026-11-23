import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const count = await prisma.user.count({
      where: { status: "LOCKED" },
    });
    return NextResponse.json({ count });
  } catch (err) {
    return NextResponse.json({ count: 0 });
  }
}
