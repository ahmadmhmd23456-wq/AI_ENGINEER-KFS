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

  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("REGISTER");
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

  useEffect(() => {
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
  }, [errorParam]);

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
        deviceFingerprint: deviceInfo.fingerprint,
        phoneType: phoneType || deviceInfo.deviceModel,
        redirect: false,
      });

      if (res?.error) {
        if (res.error.includes("ACCOUNT_LOCKED")) {
          window.location.href = "/locked";
          return;
        }
        setErrorMessage(res.error || "فشل تسجيل الدخول. تأكد من الجيميل وكلمة المرور.");
        playTargetLock();
        setIsLoading(false);
        return;
      }

      playSuccessChime();
      window.location.href = "/student/courses";
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
          <span>ربط أمني بنوع الهاتف والجيميل</span>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="max-w-lg w-full mx-auto my-auto py-6">
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden anim-video-text eng-cyber-card">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* أزرار التبديل بين إنشاء الحساب وتسجيل الدخول */}
          <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1 mb-6">
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
          </div>

          {/* تنبيه الأخطاء أو النجاح */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* كارت كشف وتوثيق نوع الهاتف تلقائياً (Device & Phone Hardware Badge) */}
          <div className="mb-6 p-3.5 bg-slate-950/80 border border-blue-500/30 rounded-2xl flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">نوع الفون المكتشف:</span>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{phoneType || deviceInfo?.deviceModel || "جاري الكشف..."}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </span>
              </div>
            </div>

            <span className="text-[10px] font-mono bg-blue-950/60 text-blue-400 border border-blue-800/40 px-2 py-0.5 rounded-md">
              موثق أمنياً
            </span>
          </div>

          {/* 1. نموذج إنشاء حساب جديد */}
          {mode === "REGISTER" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">الاسم ثلاثي أو رباعي</label>
                <input
                  type="text"
                  required
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
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">كلمة المرور</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    تأكيد موديل الفون المسجل
                  </label>
                  <input
                    type="text"
                    value={phoneType}
                    onChange={(e) => setPhoneType(e.target.value)}
                    placeholder="مثال: iPhone 14 Pro أو Samsung A54"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-[11px] text-slate-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  نظام الأمان يقوم بتسجيل <strong>الجيميل ونوع هاتفك الحالي</strong> في ملفك.. في حال محاولة فتح الحساب من هاتف آخر أو بجيميل مختلف سيتم حظر الحساب وإشعار الإدارة فوراً.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                onMouseEnter={playCyberHover}
                onClick={playCyberClick}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>{isLoading ? "جاري إنشاء الحساب وتوثيق الهاتف..." : "إنشاء الحساب وتوثيق بيانات الهاتف"}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
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
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="أدخل الجيميل أو رقم الهاتف المسجل"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">كلمة المرور</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  dir="ltr"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-start gap-2">
                <Lock className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>
                  يتم التحقق تلقائياً من مطابقة <strong>نوع الهاتف وبصمة العتاد</strong> المسجلة لحسابك قبل السماح بالدخول.
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
            </form>
          )}

          {/* خط فاصل */}
          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase tracking-wider font-mono">
              تجربة سريعة وفورية للمعاينة
            </span>
          </div>

          {/* أزرار التجربة السريعة للأدمن والطلاب */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                playCyberClick();
                handleDemoLogin("eng.teacher@gmail.com", "ADMIN");
              }}
              onMouseEnter={playCyberHover}
              disabled={isLoading}
              className="w-full py-2.5 px-3.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-xl text-xs font-semibold flex items-center justify-between transition-all"
            >
              <span>دخول سريع كأدمن (د. محمد - إدارة المنصة)</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                playCyberClick();
                handleDemoLogin("ahmed.student@gmail.com", "STUDENT");
              }}
              onMouseEnter={playCyberHover}
              disabled={isLoading}
              className="w-full py-2.5 px-3.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold flex items-center justify-between transition-all"
            >
              <span>دخول سريع كطالب نشط (أحمد - هاتف موثق)</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                playCyberClick();
                handleDemoLogin("omar.hassan@gmail.com", "STUDENT");
              }}
              onMouseEnter={playCyberHover}
              disabled={isLoading}
              className="w-full py-2.5 px-3.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold flex items-center justify-between transition-all"
            >
              <span>تجربة قفل الحساب الأمني (عمر - هاتف غير مصرح)</span>
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>
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
