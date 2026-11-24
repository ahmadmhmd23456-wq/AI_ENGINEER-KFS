import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. فحص حماية CSRF على الطلبات التي تغيّر البيانات (POST, PUT, DELETE, PATCH)
  const method = request.method.toUpperCase();
  const isStateChanging = ["POST", "PUT", "DELETE", "PATCH"].includes(method);
  const isWebhook = pathname.startsWith("/api/webhooks");
  const isNextAuth = pathname.startsWith("/api/auth");

  if (isStateChanging && !isWebhook && !isNextAuth) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    const forwardedHost = request.headers.get("x-forwarded-host");

    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        // التحقق من تطابق الـ Host مع الـ Origin لمنع هجمات CSRF الخارجية
        if (originUrl.host !== host && originUrl.host !== forwardedHost) {
          // السماح في حالة الدومين الموثق للـ tunnel أو localhost أو vercel.app
          const isAllowedDomain =
            originUrl.host.includes("localhost") ||
            originUrl.host.includes("trycloudflare.com") ||
            originUrl.host.includes("vercel.app") ||
            originUrl.host.includes("127.0.0.1");

          if (!isAllowedDomain) {
            return new NextResponse(
              JSON.stringify({ error: "CSRF verification failed: Invalid origin" }),
              {
                status: 403,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
        }
      } catch {
        return new NextResponse(
          JSON.stringify({ error: "CSRF verification failed: Malformed origin header" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }
  }

  // 2. حماية مسارات الإدارة والحسابات الحساسة
  if (pathname.startsWith("/admin")) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const adminEmails = [
      "ahmadmhmd23456@gmail.com",
      process.env.ADMIN_EMAIL?.toLowerCase().trim(),
    ].filter(Boolean);

    const isAuthorizedAdmin =
      token.role === "ADMIN" &&
      token.email &&
      adminEmails.includes((token.email as string).toLowerCase().trim());

    if (!isAuthorizedAdmin) {
      // حظر وتوجيه أي طالب أو مستخدم غير مصرح يحاول فتح صفحات الإدارة
      return NextResponse.redirect(new URL("/student/courses", request.url));
    }
  }

  const hasSessionToken =
    request.cookies.has("__Secure-next-auth.session-token") ||
    request.cookies.has("next-auth.session-token");

  if (pathname.startsWith("/account") && !hasSessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. معالجة الاستجابة وتطبيق ترويسات الحماية الصارمة
  const response = NextResponse.next();

  // ترويسات الأمان
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // Content-Security-Policy
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'self'",
    "form-action 'self' https:",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");
  response.headers.set("Content-Security-Policy", cspHeader);

  // إخفاء هوية التقنية
  response.headers.delete("X-Powered-By");

  return response;
}

export const config = {
  matcher: [
    /*
     * تطبيق الميدلوير على كل المسارات عدا الملفات الثابتة (_next/static, _next/image, favicon.ico)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
