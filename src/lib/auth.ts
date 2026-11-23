import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";
import { lockAccountAndAlertAdmin } from "./security-guard";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 يوماً
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    // 1. تسجيل الدخول المباشر للطلاب بـ (الجيميل + كلمة المرور + نوع الفون وبصمته)
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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("يرجى إدخال الجيميل وكلمة المرور");
        }

        const email = credentials.email.toLowerCase().trim();
        const fingerprint = credentials.deviceFingerprint || "unknown-fp";
        const currentPhoneType = credentials.phoneType || "هاتف محمول";
        const ipAddress = credentials.ipAddress || "127.0.0.1";
        const userAgent = credentials.userAgent || "متصفح الويب";

        const user = await prisma.user.findFirst({
          where: {
            OR: [{ email }, { phone: email }],
          },
          include: {
            devices: true,
            academicLevel: true,
          },
        });

        if (!user) {
          throw new Error("البيانات غير صحيحة، أو الحساب غير مسجل بعد.");
        }

        // 1. فحص هل الحساب محظور أمنياً؟
        if (user.status === "LOCKED") {
          // تسجيل محاولة دخول لحساب محظور
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

        // 2. التحقق من كلمة المرور إن وجدت
        if (user.passwordHash) {
          const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isPasswordValid) {
            throw new Error("كلمة المرور غير صحيحة.");
          }
        }

        // 3. الفحص الأمني لنوع الفون وبصمة الجهاز للطلاب (Anti-Account Sharing)
        if (user.role === "STUDENT") {
          const approvedDevice = user.devices.find((d) => d.deviceFingerprint === fingerprint);

          if (!approvedDevice) {
            const approvedCount = user.devices.filter((d) => d.isApproved).length;

            // إذا تجاوز الحد المسموح به (جهاز واحد افتراضياً)
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
              // تسجيل الجهاز الجديد إذا كان الحساب يسمح
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
            // تحديث وقت آخر نشاط وموديل الهاتف
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
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "demo-google-client-secret",
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
        const adminEmail = (process.env.ADMIN_EMAIL || "eng.teacher@gmail.com").toLowerCase().trim();

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
    async signIn({ user, account, profile }) {
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
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.status = (user as any).status;
        token.phone = (user as any).phone;
        token.academicLevelId = (user as any).academicLevelId;
      }

      if (trigger === "update" && session) {
        if (session.academicLevelId) token.academicLevelId = session.academicLevelId;
        if (session.phone) token.phone = session.phone;
        if (session.status) token.status = session.status;
      }

      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, status: true, phone: true, academicLevelId: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
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
        (session.user as any).role = token.role;
        (session.user as any).status = token.status;
        (session.user as any).phone = token.phone;
        (session.user as any).academicLevelId = token.academicLevelId;
      }
      return session;
    },
  },
};

export default authOptions;
