import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "غير مصرح. يرجى تسجيل الدخول أولاً." }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "يرجى إدخال كلمة المرور الحالية والجديدة." }, { status: 400 });
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({ error: "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف وأرقام." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "المستخدم غير موجود." }, { status: 404 });
    }

    if (user.passwordHash) {
      const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة." }, { status: 400 });
      }
    }

    // تشفير كلمة المرور الجديدة بـ 12 جولة bcrypt
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return NextResponse.json({
      success: true,
      message: "تم تحديث كلمة المرور بنجاح.",
    });
  } catch (error: any) {
    console.error("Change Password Error:", error?.message || error);
    return NextResponse.json({ error: "فشل تحديث كلمة المرور." }, { status: 500 });
  }
}
