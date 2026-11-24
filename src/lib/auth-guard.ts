import { getServerSession } from "next-auth";
import { authOptions, isPlatformAdmin } from "./auth";
import { NextResponse } from "next/server";

export interface GuardResult {
  error: NextResponse | null;
  user: {
    id: string;
    name?: string;
    email?: string;
    role: string;
    status: string;
    phone?: string;
    academicLevelId?: string;
  } | null;
}

/**
 * التحقق من تسجيل دخول المستخدم
 */
export async function requireAuth(): Promise<GuardResult> {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user?.id) {
    return {
      error: NextResponse.json(
        { error: "غير مصرح. يرجى تسجيل الدخول للوصول لهذا المورد." },
        { status: 401 }
      ),
      user: null,
    };
  }

  if (user.status === "LOCKED") {
    return {
      error: NextResponse.json(
        { error: "حسابك موقوف أمنياً. يرجى التواصل مع الإدارة." },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { error: null, user };
}

/**
 * التحقق من صلاحيات الإدارة (Admin Role)
 */
export async function requireAdmin(): Promise<GuardResult> {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user?.id && !user?.email) {
    return {
      error: NextResponse.json(
        { error: "غير مصرح. يرجى تسجيل الدخول بحساب مسؤول." },
        { status: 401 }
      ),
      user: null,
    };
  }

  const isAdmin = user.role === "ADMIN" || isPlatformAdmin(user.email);

  if (!isAdmin) {
    return {
      error: NextResponse.json(
        { error: "مرفوض: لا تمتلك صلاحيات الإدارة للوصول لهذه البيانات." },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { error: null, user: { ...user, role: "ADMIN" } };
}
