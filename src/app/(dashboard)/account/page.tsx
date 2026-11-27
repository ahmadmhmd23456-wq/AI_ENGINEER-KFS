"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Shield,
  Key,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Layers,
  Lock,
  ArrowRight,
} from "lucide-react";

const DEPARTMENT_LABELS: Record<string, string> = {
  GENERAL: "الشعبة العامة (إعدادي هندسة)",
  AI: "هندسة الذكاء الاصطناعي",
  MECHATRONICS: "هندسة الميكاترونكس والروبوتات",
  ARCHITECTURE: "الهندسة المعمارية والتصميم",
  CIVIL: "الهندسة المدنية / الإنشائية",
};

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // حقول تغيير كلمة المرور
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/student/courses")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "كلمتا المرور غير متطابقتين." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "كلمة المرور يجب ألا تقل عن 8 أحرف." });
      return;
    }

    setSavingPassword(true);
    setPasswordMessage(null);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordMessage({ type: "error", text: data.error || "فشل تغيير كلمة المرور." });
      } else {
        setPasswordMessage({ type: "success", text: "تم تحديث كلمة المرور بنجاح!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordMessage({ type: "error", text: "حدث خطأ بالاتصال بالخادم." });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">جاري تحميل بيانات الحساب...</div>;
  }

  const isPrepLevel = user?.academicLevel?.slug === "prep";
  const departmentDisplay = isPrepLevel
    ? DEPARTMENT_LABELS.GENERAL
    : user?.department
    ? DEPARTMENT_LABELS[user.department] || user.department
    : "غير محدد";

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 py-6 px-4 sm:px-6">
    <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">
      {/* الترويسة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <User className="w-6 h-6 text-blue-400" />
            <span>إعدادات الحساب والأمان</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            إدارة بياناتك الشخصية، عرض القسم والفرقة، وتغيير كلمة المرور.
          </p>
        </div>

        <Link
          href="/student/courses"
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 self-start sm:self-auto transition-all"
        >
          <ArrowRight className="w-4 h-4 text-blue-400" />
          <span>العودة للمواد الدراسية</span>
        </Link>
      </div>

      {/* بيانات الحساب والقسم الهندسي */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>المعلومات الشخصية والأكاديمية الموثقة</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <span className="text-slate-500 font-mono">الاسم:</span>
            <div className="text-white font-bold">{user?.name || "غير محدد"}</div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <span className="text-slate-500 font-mono">البريد الإلكتروني (الجيميل):</span>
            <div className="text-white font-mono">{user?.email || "غير محدد"}</div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <span className="text-slate-500 font-mono">رقم الهاتف:</span>
            <div className="text-white font-mono">{user?.phone || "غير محدد"}</div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <span className="text-slate-500 font-mono">الفرقة الدراسية:</span>
            <div className="text-white font-bold flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-blue-400" />
              <span>{user?.academicLevel?.name || "غير محدد"}</span>
            </div>
          </div>

          <div className="md:col-span-2 p-4 bg-slate-950 border border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-slate-400 font-mono flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>القسم الهندسي:</span>
              </span>
              <div className="text-sm text-white font-bold">{departmentDisplay}</div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-medium">
              <Lock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>لا يمكن تغيير القسم إلا من خلال الأدمن</span>
            </div>
          </div>
        </div>
      </div>

      {/* تغيير كلمة المرور */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-400" />
          <span>تغيير كلمة المرور</span>
        </h2>

        {passwordMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              passwordMessage.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            {passwordMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{passwordMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">كلمة المرور الحالية:</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">كلمة المرور الجديدة:</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">تأكيد كلمة المرور الجديدة:</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {savingPassword ? "جاري الحفظ..." : "تحديث كلمة المرور"}
          </button>
        </form>
      </div>
    </div>
    </div>
  );
}
