"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Phone,
  User,
  ShieldCheck,
  Send,
  CheckCircle,
  AlertCircle,
  Smartphone,
  ChevronLeft,
} from "lucide-react";
import { getDeviceFingerprint } from "@/lib/fingerprint";

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Name & Phone, 2: OTP, 3: Academic Level
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [levels, setLevels] = useState<any[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [deviceInfo, setDeviceInfo] = useState<{ fingerprint: string; deviceName: string } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.name && !name) {
      setName(session.user.name);
    }

    // جلب بصمة الجهاز
    getDeviceFingerprint().then(setDeviceInfo);

    // جلب قائمة الدفعات المتاحة
    fetch("/api/levels")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLevels(data);
          if (data.length > 0) setSelectedLevelId(data[0].id);
        }
      })
      .catch(() => {});
  }, [session, name]);

  // إرسال كود الـ OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("برجاء إدخال الاسم ثلاثي على الأقل");
      return;
    }
    if (!phone || !/^01[0125][0-9]{8}$/.test(phone)) {
      setErrorMsg("برجاء إدخال رقم هاتف مصري صحيح (11 رقماً يبدأ بـ 01)");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SEND_OTP", phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "فشل إرسال كود التحقق");
        setIsLoading(false);
        return;
      }

      if (data.devOtp) {
        setDevOtpHint(data.devOtp);
      }
      setStep(2);
    } catch {
      setErrorMsg("حدث خطأ بالاتصال بالخادم");
    } finally {
      setIsLoading(false);
    }
  };

  // التحقق من كود الـ OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!otpCode || otpCode.length !== 6) {
      setErrorMsg("رمز التحقق يجب أن يتكون من 6 أرقام");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "VERIFY_OTP", phone, code: otpCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "رمز التحقق غير صحيح");
        setIsLoading(false);
        return;
      }

      setStep(3); // الانتقال لاختيار الدفعة
    } catch {
      setErrorMsg("حدث خطأ أثناء التحقق من الرمز");
    } finally {
      setIsLoading(false);
    }
  };

  // إنهاء التسجيل واختيار الدفعة وربط بصمة الجهاز
  const handleCompleteOnboarding = async () => {
    setErrorMsg(null);
    if (!selectedLevelId) {
      setErrorMsg("برجاء اختيار دفعتك الدراسية");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          academicLevelId: selectedLevelId,
          deviceFingerprint: deviceInfo?.fingerprint,
          deviceName: deviceInfo?.deviceName,
          email: session?.user?.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "فشل حفظ البيانات");
        setIsLoading(false);
        return;
      }

      router.push("/student/courses");
    } catch {
      setErrorMsg("حدث خطأ أثناء إتمام التسجيل");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col justify-center p-4 sm:p-6" dir="rtl">
      <div className="max-w-lg w-full mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        {/* مؤشر الخطوات */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                step >= 1 ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-500"
              }`}
            >
              1
            </span>
            <span className="text-xs font-medium text-slate-300">البيانات والهاتف</span>
          </div>
          <ChevronLeft className="w-4 h-4 text-slate-600" />
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                step >= 2 ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-500"
              }`}
            >
              2
            </span>
            <span className="text-xs font-medium text-slate-300">تأكيد الـ OTP</span>
          </div>
          <ChevronLeft className="w-4 h-4 text-slate-600" />
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                step === 3 ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-500"
              }`}
            >
              3
            </span>
            <span className="text-xs font-medium text-slate-300">اختيار الدفعة</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* الخطوة 1: الاسم ورقم الهاتف */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white mb-1">استكمال بيانات الطالب</h2>
              <p className="text-xs text-slate-400">
                الحساب مربوط ببريدك:{" "}
                <span className="text-blue-400 font-mono">{session?.user?.email || "جاري التحقق..."}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">الاسم بالكامل (ثلاثي):</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد محمود علي"
                  className="w-full py-3 pr-10 pl-4 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <User className="w-4 h-4 text-slate-500 absolute top-3.5 right-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">رقم الهاتف (واتساب):</label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01012345678"
                  className="w-full py-3 pr-10 pl-4 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  dir="ltr"
                />
                <Phone className="w-4 h-4 text-slate-500 absolute top-3.5 right-3.5" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                سيتم إرسال كود تحقق مكون من 6 أرقام على واتساب هذا الرقم.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
            >
              {isLoading ? "جاري الإرسال..." : "إرسال كود التحقق (OTP)"}
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* الخطوة 2: إدخال كود الـ OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center mb-3">
                <Smartphone className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">التحقق من رقم الهاتف</h2>
              <p className="text-xs text-slate-400">
                أدخل الكود المرسل إلى رقمك: <span className="text-blue-400 font-mono" dir="ltr">{phone}</span>
              </p>
            </div>

            {devOtpHint && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs text-center">
                كود التحقق في وضع التطوير: <strong className="font-mono text-sm tracking-widest">{devOtpHint}</strong>
              </div>
            )}

            <div>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="------"
                className="w-full py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-center text-2xl font-mono tracking-[0.5em] text-white focus:outline-none focus:border-blue-500"
                dir="ltr"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
            >
              {isLoading ? "جاري التحقق..." : "تأكيد الرمز والمتابعة"}
              <CheckCircle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-300"
            >
              تعديل رقم الهاتف؟
            </button>
          </form>
        )}

        {/* الخطوة 3: اختيار الدفعة */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-3">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">اختر دفعتك الدراسية</h2>
              <p className="text-xs text-slate-400">
                تنبيه: يمكنك تغيير دفعتك فقط بعد موافقة المدرس/الأدمن.
              </p>
            </div>

            <div className="space-y-2.5">
              {levels.map((lvl) => {
                const isSelected = selectedLevelId === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSelectedLevelId(lvl.id)}
                    className={`w-full p-4 rounded-2xl border text-right transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10"
                        : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold">{lvl.name}</div>
                      <div className="text-[11px] text-slate-400">5 مواد للترم الأول + 5 مواد للترم الثاني</div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? "border-blue-500 bg-blue-500 text-white" : "border-slate-700"
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* تنبيه ربط الجهاز */}
            <div className="p-3.5 bg-blue-950/40 border border-blue-800/40 rounded-xl text-[11px] text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-blue-400">
                <ShieldCheck className="w-4 h-4" />
                <span>ربط أمني نهائي:</span>
              </div>
              <p className="text-slate-400">
                سيتم اعتماد جهازك الحالي ({deviceInfo?.deviceName || "المتصفح"}) كجهاز وحيد لحسابك. أي محاولة دخول من هاتف أو حاسوب آخر ستقفل الحساب فوراً.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCompleteOnboarding}
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {isLoading ? "جاري الحفظ والتفعيل..." : "تأكيد الدفعة وبدء الدراسة"}
              <CheckCircle className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
