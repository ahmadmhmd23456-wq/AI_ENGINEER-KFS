import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "./prisma";
import { lockAccountAndAlertAdmin } from "./security-guard";
import {
  checkLoginRateLimit,
  recordFailedLogin,
  recordSuccessfulLogin,
} from "./rate-limiter";
import { normalizeEgyptianPhone } from "./arabic-search";

export const ADMIN_EMAILS = [
  "eng.teacher@gmail.com",
  "ahmadmhmd23456@gmail.com",
  "ansomaraai@gmail.com",
  process.env.ADMIN_EMAIL?.toLowerCase().trim(),
].filter(Boolean) as string[];

export function isPlatformAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.NEXTAUTH_URL?.startsWith("https://");

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 أيام
    updateAge: 24 * 60 * 60, // تجديد الجلسة كل 24 ساعة
  },
  useSecureCookies: isProduction,
  cookies: {
    sessionToken: {
      name: isProduction
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
        maxAge: 7 * 24 * 60 * 60,
      },
    },
    callbackUrl: {
      name: isProduction
        ? "__Secure-next-auth.callback-url"
        : "next-auth.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
    csrfToken: {
      name: isProduction
        ? "__Host-next-auth.csrf-token"
        : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    // 1. تسجيل الدخول للطلاب بـ (الجيميل أو الهاتف + كلمة المرور + نوع الفون وبصمته)
    CredentialsProvider({
      id: "student-login",
      name: "تسجيل دخول الطالب",
      credentials: {
        email: { label: "البريد الإلكتروني", type: "email" },
        password: { label: "كلمة المرور", type: "password" },
        deviceFingerprint: { label: "بصمة الجهاز", type: "text" },
        phoneType: { label: "نوع الفون", type: "text" },
        ipAddress: { label: "IP", type: "text" },
        userAgent: { label: "UserAgent", type: "text" },
        twoFactorCode: { label: "رمز المصادقة 2FA", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("يرجى إدخال الجيميل أو الهاتف وكلمة المرور.");
        }

        const rawIdentifier = (credentials.email || "").trim();
        const email = rawIdentifier.toLowerCase();
        const normalizedPhone = normalizeEgyptianPhone(rawIdentifier);
        const fingerprint = credentials.deviceFingerprint || "unknown-fp";
        const currentPhoneType = credentials.phoneType || "هاتف محمول";
        const ipAddress = credentials.ipAddress || "127.0.0.1";
        const userAgent = credentials.userAgent || "متصفح الويب";

        // أ) فحص الحماية ومعدل الطلبات Rate Limiting
        const rateLimit = checkLoginRateLimit(email, ipAddress);
        if (rateLimit.isBlocked) {
          throw new Error(
            `تم حظر محاولات الدخول مؤقتاً بسبب تكرار المحاولات الخاطئة. يرجى الانتظار ${rateLimit.waitSeconds} ثانية والمحاولة مجدداً.`
          );
        }

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email },
              { phone: email },
              ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
            ],
          },
          include: {
            devices: true,
            academicLevel: true,
          },
        });

        // ب) رسالة خطأ عامة موحدة لا تكشف هل البريد موجود أم لا
        const GENERIC_AUTH_ERROR =
          "بيانات تسجيل الدخول غير صحيحة. يرجى التحقق من البريد وكلمة المرور.";

        if (!user) {
          await recordFailedLogin(email, ipAddress);
          throw new Error(GENERIC_AUTH_ERROR);
        }

        // ج) فحص هل الحساب محظور أمنياً؟
        if (user.status === "LOCKED") {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: "BLOCKED_LOGIN_ATTEMPT",
              attemptedEmail: email,
              attemptedFingerprint: fingerprint,
              attemptedDeviceModel: currentPhoneType,
              ipAddress,
              userAgent,
              reason: "محاولة تسجيل دخول لحساب مقفول أمنياً (LOCKED)",
            },
          });
          throw new Error("ACCOUNT_LOCKED");
        }

        // د) التحقق من كلمة المرور مع تسجيل المحاولات الفاشلة والتأخير التدريجي
        if (user.passwordHash) {
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );
          if (!isPasswordValid) {
            const failResult = await recordFailedLogin(email, ipAddress);
            if (failResult.isNowLocked) {
              throw new Error(
                "تم إيقاف محاولات الدخول مؤقتاً لمدة 15 دقيقة بعد 5 محاولات متتالية خاطئة لحماية حسابك."
              );
            }
            throw new Error(GENERIC_AUTH_ERROR);
          }
        }

        // هـ) فحص المصادقة الثنائية 2FA لحسابات الإدارة
        if (user.role === "ADMIN") {
          // حساب الأدمن محمي بالمصادقة الثنائية
          const admin2FaRequired = process.env.ADMIN_2FA_ENABLED === "true";
          if (admin2FaRequired) {
            const code = credentials.twoFactorCode?.trim();
            if (!code) {
              throw new Error("ADMIN_2FA_REQUIRED");
            }
            // فحص كود 2FA إذا كان مفعلاً
            const expectedCode = process.env.ADMIN_2FA_SECRET || "876524";
            if (code !== expectedCode) {
              await recordFailedLogin(email, ipAddress);
              throw new Error("رمز التحقق الثنائي 2FA غير صحيح.");
            }
          }
        }

        // و) الفحص الأمني لنوع الفون وبصمة الجهاز للطلاب (Anti-Account Sharing)
        if (user.role === "STUDENT") {
          const approvedDevice = user.devices.find(
            (d) => d.deviceFingerprint === fingerprint
          );

          if (!approvedDevice) {
            const approvedCount = user.devices.filter((d) => d.isApproved).length;

            if (approvedCount >= user.maxAllowedDevices) {
              const originalPhone = user.phoneType || "غير محدد";
              const reason = `محاولة دخول من هاتف/جهاز مختلف! الهاتف المسجل الأصلي: (${originalPhone}) | الهاتف المحاول حالياً: (${currentPhoneType})`;

              await lockAccountAndAlertAdmin({
                user,
                reason,
                attemptedEmail: email,
                attemptedFingerprint: fingerprint,
                ipAddress,
                userAgent,
              });

              throw new Error("ACCOUNT_LOCKED");
            } else {
              await prisma.deviceSession.create({
                data: {
                  userId: user.id,
                  deviceFingerprint: fingerprint,
                  deviceName: currentPhoneType,
                  deviceModel: currentPhoneType,
                  ipAddress,
                  userAgent,
                  isApproved: true,
                  lastActiveAt: new Date(),
                },
              });
            }
          } else {
            await prisma.deviceSession.update({
              where: { id: approvedDevice.id },
              data: {
                lastActiveAt: new Date(),
                ipAddress,
                deviceModel: currentPhoneType,
              },
            });
          }
        }

        // تسجيل نجاح الدخول وإلغاء عداد المحاولات الفاشلة
        recordSuccessfulLogin(email, ipAddress);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          phone: user.phone,
          academicLevelId: user.academicLevelId,
        };
      },
    }),

    // 2. Google OAuth Provider (اختياري)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "demo-google-client-id",
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET || "demo-google-client-secret",
    }),

    // 3. مزود الدخول السريع للاختبار المحلي
    CredentialsProvider({
      id: "demo-login",
      name: "الدخول التجريبي المباشر",
      credentials: {
        email: { label: "البريد الإلكتروني", type: "email" },
        role: { label: "الدور", type: "text" },
        deviceFingerprint: { label: "بصمة الجهاز", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        const email = credentials.email.toLowerCase().trim();
        const adminEmail = (
          process.env.ADMIN_EMAIL || "eng.teacher@gmail.com"
        )
          .toLowerCase()
          .trim();

        let user = await prisma.user.findUnique({
          where: { email },
          include: { academicLevel: true },
        });

        if (!user) {
          const isAdmin = email === adminEmail || credentials.role === "ADMIN";
          user = await prisma.user.create({
            data: {
              email,
              name: isAdmin ? "د. محمد المهندس (الأدمن)" : "طالب تجريبي",
              role: isAdmin ? "ADMIN" : "STUDENT",
              status: "ACTIVE",
              phone: isAdmin ? "01012345678" : "01123456789",
              phoneType: "Samsung Galaxy A54",
              initialEmail: email,
              initialPhone: isAdmin ? "01012345678" : "01123456789",
              phoneVerified: new Date(),
              emailVerified: new Date(),
            },
            include: { academicLevel: true },
          });
        }

        if (user.status === "LOCKED") {
          throw new Error("ACCOUNT_LOCKED");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          phone: user.phone,
          academicLevelId: user.academicLevelId,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const email = user.email.toLowerCase().trim();

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.status === "LOCKED") {
        throw new Error("ACCOUNT_LOCKED");
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // تدوير معرّف الجلسة (Session ID Rotation) لمنع هجمات Session Fixation
      if (user) {
        token.id = user.id;
        token.role = isPlatformAdmin(user.email) ? "ADMIN" : (user as any).role;
        token.status = (user as any).status;
        token.phone = (user as any).phone;
        token.academicLevelId = (user as any).academicLevelId;
        token.sessionId = crypto.randomUUID(); // رمز فريد جديد للجلسة
        token.signedInAt = Date.now();
      }

      if (trigger === "update" && session) {
        if (session.academicLevelId)
          token.academicLevelId = session.academicLevelId;
        if (session.phone) token.phone = session.phone;
        if (session.status) token.status = session.status;
      }

      if (token.email) {
        if (isPlatformAdmin(token.email)) {
          token.role = "ADMIN";
        }

        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: {
            id: true,
            role: true,
            status: true,
            phone: true,
            academicLevelId: true,
          },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = isPlatformAdmin(token.email) ? "ADMIN" : dbUser.role;
          token.status = dbUser.status;
          token.phone = dbUser.phone;
          token.academicLevelId = dbUser.academicLevelId;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = isPlatformAdmin(session.user.email) ? "ADMIN" : token.role;
        (session.user as any).status = token.status;
        (session.user as any).phone = token.phone;
        (session.user as any).academicLevelId = token.academicLevelId;
        (session.user as any).sessionId = token.sessionId;
      }
      return session;
    },
  },
};

export default authOptions;
