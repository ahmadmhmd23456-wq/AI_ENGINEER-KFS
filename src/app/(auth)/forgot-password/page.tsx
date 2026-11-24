"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Lock, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"REQUEST" | "VERIFY" | "SUCCESS">("REQUEST");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // إرسال كود التحقق
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REQUEST_RESET", phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل إرسال رمز التحقق.");
        setLoading(false);
        return;
      }
      setStep("VERIFY");
    } catch {
      setError("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  // تأكيد الكود وتعيين كلمة المرور الجديدة
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }
    if (newPassword.length < 8) {
      setError("كلمة المرور يجب ألا تقل عن 8 أحرف وأرقام.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CONFIRM_RESET", phone, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل تعيين كلمة المرور الجديدة.");
        setLoading(false);
        return;
      }
      setStep("SUCCESS");
    } catch {
      setError("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col justify-center items-center p-4 sm:p-6" dir="rtl">
      <div className="max-w-md w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/login"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="العودة لتسجيل الدخول"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-white">استعادة كلمة المرور</h1>
            <p className="text-[11px] text-slate-400">إعادة تعيين آمنة ومحمية لحسابك الأكاديمي</p>
          </div>
        </div>

        <div className="mb-5 p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-center space-y-2">
          <p className="text-xs font-bold text-emerald-300">
            لو نسيت كلمة السر تواصل مع م/احمد
          </p>
          <a
            href="https://wa.me/201065375309?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%20%D9%85%2F%D8%A3%D8%AD%D9%85%D8%AF%D8%8C%20%D9%86%D8%B3%D9%8A%D8%AA%20%D9%83%D9%84%D9%85%D8%A9%20%D8%A7%D9%84%D9%85%D8%B1%D9%88%D8%B1%20%D9%84%D8%AD%D8%B3%D8%A7%D8%A8%D9%8A%20%D8%B9%D9%84%D9%89%20%D9%85%D9%86%D8%B5%D8%A9%20%D9%87%D9%86%D8%AF%D8%B3%D8%A9"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
          >
            <span>فتح محادثة واتساب مع م/ أحمد (01065375309)</span>
          </a>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === "REQUEST" && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                رقم الهاتف المسجل (واتساب):
              </label>
              <input
                type="tel"
                required
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                dir="ltr"
              />
            </div>

            <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-[11px] text-slate-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <span>سيتم إرسال رمز تحقق سري ومؤقت للتأكد من هويتك قبل تغيير كلمة المرور.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              {loading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
            </button>
          </form>
        )}

        {step === "VERIFY" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                رمز التحقق (6 أرقام):
              </label>
              <input
                type="text"
                required
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono text-center tracking-widest focus:outline-none focus:border-blue-500"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                كلمة المرور الجديدة:
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                تأكيد كلمة المرور الجديدة:
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              {loading ? "جاري التعيين..." : "حفظ كلمة المرور الجديدة"}
            </button>
          </form>
        )}

        {step === "SUCCESS" && (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="text-sm font-bold text-white">تم تغيير كلمة المرور بنجاح!</h2>
            <p className="text-xs text-slate-400">
              يمكنك الآن استخدام كلمة المرور الجديدة لتسجيل الدخول بأمان إلى حسابك.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all"
            >
              <span>تسجيل الدخول الآن</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
