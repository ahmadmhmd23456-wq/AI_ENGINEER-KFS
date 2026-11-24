"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Smartphone,
  UserCheck,
  UserPlus,
  LogIn,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { getDeviceFingerprint, DeviceInfo } from "@/lib/fingerprint";
import { playCyberHover, playCyberClick, playSuccessChime, playTargetLock } from "@/lib/sound";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // حقول التسجيل الجديد
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [academicLevelId, setAcademicLevelId] = useState("");
  const [phoneType, setPhoneType] = useState("");
  const [levels, setLevels] = useState<any[]>([]);

  // حقول تسجيل الدخول
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [is2FaRequired, setIs2FaRequired] = useState(false);

  useEffect(() => {
    // التحقق من معامل المسار لتحديد التبويب
    const modeParam = searchParams.get("mode");
    if (modeParam === "register" || modeParam === "REGISTER") {
      setMode("REGISTER");
    } else if (modeParam === "login" || modeParam === "LOGIN") {
      setMode("LOGIN");
    }

    // 1. توليد بصمة الجهاز وكشف نوع وموديل الهاتف تلقائياً
    getDeviceFingerprint().then((info) => {
      setDeviceInfo(info);
      setPhoneType(info.deviceModel);
    });

    // 2. تحميل الدفعات الأكاديمية
    fetch("/api/levels")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLevels(data);
          if (data.length > 0) setAcademicLevelId(data[0].id);
        }
      })
      .catch(() => {});

    if (errorParam === "ACCOUNT_LOCKED") {
      window.location.href = "/locked";
    } else if (errorParam) {
      setErrorMessage("فشل تسجيل الدخول أو تم رفض الجلسة.");
    }
  }, [errorParam, searchParams]);

  // إرسال طلب تسجيل حساب جديد
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!deviceInfo) {
      setErrorMessage("جاري التعرف على بصمة الهاتف.. يرجى المحاولة بعد لحظات.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          academicLevelId,
          phoneType: phoneType || deviceInfo.deviceModel,
          deviceFingerprint: deviceInfo.fingerprint,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "فشل تسجيل الحساب");
        playTargetLock();
        setIsLoading(false);
        return;
      }

      playSuccessChime();
      setSuccessMessage("تم إنشاء الحساب بنجاح! جاري تسجيل دخولك تلقائياً...");

      // تسجيل الدخول الفوري بالجلسة الجديدة
      const loginRes = await signIn("student-login", {
        email,
        password,
        deviceFingerprint: deviceInfo.fingerprint,
        phoneType: phoneType || deviceInfo.deviceModel,
        redirect: false,
      });

      if (loginRes?.ok) {
        window.location.href = "/student/courses";
      } else {
        setMode("LOGIN");
        setLoginIdentifier(email);
        setSuccessMessage("تم إنشاء الحساب بنجاح! أدخل كلمة المرور لتسجيل الدخول فوراً.");
        setIsLoading(false);
      }
    } catch {
      setErrorMessage("حدث خطأ في الاتصال بالخادم");
      setIsLoading(false);
    }
  };

  // إرسال طلب تسجيل الدخول المباشر
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (!deviceInfo) {
      setErrorMessage("جاري التحقق من الهاتف...");
      setIsLoading(false);
      return;
    }

    try {
      const res = await signIn("student-login", {
        email: loginIdentifier,
        password: loginPassword,
        twoFactorCode: is2FaRequired ? twoFactorCode : undefined,
        deviceFingerprint: deviceInfo.fingerprint,
        phoneType: phoneType || deviceInfo.deviceModel,
        redirect: false,
      });

      if (res?.error) {
        if (res.error.includes("ACCOUNT_LOCKED")) {
          window.location.href = "/locked";
          return;
        }
        if (res.error.includes("ADMIN_2FA_REQUIRED")) {
          setIs2FaRequired(true);
          setErrorMessage("هذا الحساب محمي بالمصادقة الثنائية (2FA). يرجى إدخال رمز التحقق المخصص للمتابعة.");
          setIsLoading(false);
          return;
        }
        setErrorMessage(res.error || "بيانات تسجيل الدخول غير صحيحة.");
        playTargetLock();
        setIsLoading(false);
        return;
      }

      playSuccessChime();

      // التوجيه الذكي حسب الدور (أدمن أو طالب) وحسب الـ callbackUrl
      const callbackUrl = searchParams.get("callbackUrl");
      try {
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        if (sessionData?.user?.role === "ADMIN") {
          window.location.href = callbackUrl || "/admin/dashboard";
          return;
        }
      } catch {}

      window.location.href = callbackUrl || "/student/courses";
    } catch {
      setErrorMessage("حدث خطأ غير متوقع أثناء تسجيل الدخول");
      setIsLoading(false);
    }
  };

  // الدخول التجريبي السريع (أدمن / طالب تجريبي)
  const handleDemoLogin = async (demoEmail: string, role: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await signIn("demo-login", {
        email: demoEmail,
        role,
        deviceFingerprint: deviceInfo?.fingerprint || "browser-fp",
        redirect: false,
      });

      if (res?.error) {
        if (res.error.includes("ACCOUNT_LOCKED")) {
          window.location.href = "/locked";
          return;
        }
        setErrorMessage("فشل تسجيل الدخول: " + res.error);
        setIsLoading(false);
        return;
      }

      if (role === "ADMIN") {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.href = "/student/courses";
      }
    } catch {
      setIsLoading(false);
      setErrorMessage("حدث خطأ غير متوقع");
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col justify-between p-4 sm:p-6" dir="rtl">
      {/* رأس الصفحة */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 pulse-ring">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">أكاديمية هندسة</h1>
            <p className="text-xs text-blue-400">نظام توثيق وحماية حسابات الطلاب</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-3 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4" />
          <span>منصة تعليمية موثقة وآمنة</span>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="max-w-lg w-full mx-auto my-auto py-6">
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden anim-video-text eng-cyber-card">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* أزرار التبديل بين تسجيل الدخول وإنشاء الحساب */}
          <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1 mb-6">
            <button
              type="button"
              onClick={() => {
                playCyberClick();
                setMode("LOGIN");
                setErrorMessage(null);
              }}
              onMouseEnter={playCyberHover}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                mode === "LOGIN"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playCyberClick();
                setMode("REGISTER");
                setErrorMessage(null);
              }}
              onMouseEnter={playCyberHover}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                mode === "REGISTER"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>إنشاء حساب جديد</span>
            </button>
          </div>

          {/* تنبيه الأخطاء أو النجاح */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
              {mode === "REGISTER" && errorMessage.includes("مسجل بالفعل") && (
                <button
                  type="button"
                  onClick={() => {
                    playCyberClick();
                    setMode("LOGIN");
                    if (email) setLoginIdentifier(email);
                    else if (phone) setLoginIdentifier(phone);
                    setErrorMessage(null);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-bold underline text-right transition-colors"
                >
                  اضغط هنا لتسجيل الدخول مباشرة بهذا الحساب ←
                </button>
              )}
              {mode === "LOGIN" && errorMessage.includes("غير صحيحة") && (
                <div className="flex flex-col gap-1.5 pt-1 border-t border-red-500/20">
                  <a
                    href="https://wa.me/201065375309?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%20%D9%85%2F%D8%A3%D8%AD%D9%85%D8%AF%D8%8C%20%D9%86%D8%B3%D9%8A%D8%AA%20%D9%83%D9%84%D9%85%D8%A9%20%D8%A7%D9%84%D9%85%D8%B1%D9%88%D8%B1%20%D9%84%D8%AD%D8%B3%D8%A7%D8%A8%D9%8A%20%D8%B9%D9%84%D9%89%20%D9%85%D9%86%D8%B5%D8%A9%20%D9%87%D9%86%D8%AF%D8%B3%D8%A9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold underline text-right transition-colors"
                  >
                    لو نسيت كلمة السر تواصل مع م/احمد عبر الواتساب ←
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      playCyberClick();
                      setMode("REGISTER");
                      if (loginIdentifier.includes("@")) setEmail(loginIdentifier);
                      else if (loginIdentifier.startsWith("01")) setPhone(loginIdentifier);
                      setErrorMessage(null);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 font-bold underline text-right transition-colors"
                  >
                    طالب جديد وتريد التسجيل؟ اضغط هنا لإنشاء حساب جديد ←
                  </button>
                </div>
              )}
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. نموذج إنشاء حساب جديد */}
          {mode === "REGISTER" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">الاسم ثلاثي أو رباعي</label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد محمد علي"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  البريد الإلكتروني (الجيميل)
                  <span className="text-[10px] text-blue-400 mr-1.5 font-normal">
                    (سيتم حفظه وربطه بحسابك نهائياً)
                  </span>
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">رقم الهاتف (واتساب)</label>
                  <input
                    type="tel"
                    required
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">الفرقة / الدفعة الدراسية</label>
                <select
                  value={academicLevelId}
                  onChange={(e) => setAcademicLevelId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {levels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-[11px] text-slate-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  تسجيل حسابك يتيح لك الوصول الفوري للمحاضرات والشيتات وبنك الأسئلة والامتحانات التفاعلية.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                onMouseEnter={playCyberHover}
                onClick={playCyberClick}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>{isLoading ? "جاري إنشاء الحساب..." : "إنشاء الحساب وبدء التعلم"}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="text-center pt-3 border-t border-slate-800/80 mt-4">
                <p className="text-xs text-slate-400">
                  لديك حساب مسجل بالفعل؟{" "}
                  <button
                    type="button"
                    onClick={() => {
                      playCyberClick();
                      setMode("LOGIN");
                      setErrorMessage(null);
                    }}
                    className="text-blue-400 hover:text-blue-300 font-bold underline transition-colors mr-1"
                  >
                    تسجيل الدخول مباشرة
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* 2. نموذج تسجيل الدخول المباشر */}
          {mode === "LOGIN" && (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  البريد الإلكتروني (الجيميل) أو رقم الهاتف
                </label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="أدخل الجيميل أو رقم الهاتف المسجل"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">كلمة المرور الحالية</label>
                  <a
                    href="https://wa.me/201065375309?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%20%D9%85%2F%D8%A3%D8%AD%D9%85%D8%AF%D8%8C%20%D9%86%D8%B3%D9%8A%D8%AA%20%D9%83%D9%84%D9%85%D8%A9%20%D8%A7%D9%84%D9%85%D8%B1%D9%88%D8%B1%20%D9%84%D8%AD%D8%B3%D8%A7%D8%A8%D9%8A%20%D8%B9%D9%84%D9%89%20%D9%85%D9%86%D8%B5%D8%A9%20%D9%87%D9%86%D8%AF%D8%B3%D8%A9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors font-semibold hover:underline"
                  >
                    لو نسيت كلمة السر تواصل مع م/احمد
                  </a>
                </div>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  dir="ltr"
                />
              </div>

              {/* حقل المصادقة الثنائية 2FA إذا كان مطلوباً */}
              {is2FaRequired && (
                <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-2 animate-fadeIn">
                  <label className="block text-xs font-bold text-amber-300">
                    رمز المصادقة الثنائية (2FA Code):
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="one-time-code"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="أدخل رمز التحقق المكون من 6 أرقام"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/50 rounded-xl text-xs text-white font-mono text-center tracking-widest focus:outline-none focus:border-amber-400"
                    maxLength={8}
                    dir="ltr"
                  />
                  <p className="text-[10px] text-amber-400/80">
                    تم إرسال رمز التحقق إلى وسيلة المصادقة المعتمدة لحسابك.
                  </p>
                </div>
              )}

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-start gap-2">
                <Lock className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>
                  تسجيل دخول آمن ومشفر لحماية حسابك ومحتوى محاضراتك التعليمية.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                onMouseEnter={playCyberHover}
                onClick={playCyberClick}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>{isLoading ? "جاري التحقق من بيانات الدخول..." : "تسجيل الدخول للمنصة"}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="text-center pt-3 border-t border-slate-800/80 mt-4">
                <p className="text-xs text-slate-400">
                  طالب جديد وتريد الانضمام للمنصة؟{" "}
                  <button
                    type="button"
                    onClick={() => {
                      playCyberClick();
                      setMode("REGISTER");
                      setErrorMessage(null);
                    }}
                    className="text-blue-400 hover:text-blue-300 font-bold underline transition-colors mr-1"
                  >
                    إنشاء حساب جديد الآن
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* التذييل */}
      <footer className="text-center text-xs text-slate-600 py-3">
        منصة هندسة التعليمية &copy; {new Date().getFullYear()} - جميع الحقوق محفوظة للمدرس
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center text-slate-400 font-cairo">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs">جاري تهيئة منصة هندسة التعليمية...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
