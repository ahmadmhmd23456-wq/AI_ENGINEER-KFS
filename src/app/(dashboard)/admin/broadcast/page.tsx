"use client";

import React, { useState, useEffect } from "react";
import { Send, Users, BookOpen, GraduationCap, MessageCircle, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminBroadcastPage() {
  const [levels, setLevels] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  const [targetType, setTargetType] = useState<"ALL_STUDENTS" | "ACADEMIC_LEVEL" | "SUBJECT_ENROLLED">("ALL_STUDENTS");
  const [targetId, setTargetId] = useState("");
  const [messageText, setMessageText] = useState(
    "أهلاً يا بشمهندس {name} 👋\nنود إعلامك بأنه تم رفع محتوى جديد وشيت المحاضرة على المنصة. بالتوفيق!"
  );

  const [sending, setSending] = useState(false);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/subjects")
      .then((res) => res.json())
      .then((data) => {
        setLevels(data.levels || []);
        setSubjects(data.subjects || []);
        if (data.levels?.length > 0) setTargetId(data.levels[0].id);
      })
      .catch(() => {});
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessInfo(null);
    setErrorInfo(null);

    if (!messageText.trim()) {
      setErrorInfo("برجاء كتابة نص الرسالة");
      return;
    }

    if (!confirm("هل أنت متأكد من بدء إرسال الرسالة لجميع الطلاب المستهدفين عبر الواتساب؟")) {
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId: targetType === "ALL_STUDENTS" ? undefined : targetId,
          messageText,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessInfo(data.message);
      } else {
        setErrorInfo(data.error || "فشل إرسال الرسائل الجماعية");
      }
    } catch {
      setErrorInfo("حدث خطأ في الاتصال بالخادم");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-white">إرسال رسائل جماعية (WhatsApp Broadcast)</h1>
        <p className="text-xs text-slate-400 mt-1">
          إرسال تنبيهات مباشرة لجميع الطلاب أو لدفعة محددة أو للطلاب المشتركين في مادة معينة.
        </p>
      </div>

      {successInfo && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successInfo}</span>
        </div>
      )}

      {errorInfo && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorInfo}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* فورم الإرسال */}
        <form onSubmit={handleSend} className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
          {/* اختيار الجمهور المستهدف */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">الجمهور المستهدف:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTargetType("ALL_STUDENTS")}
                className={`p-3 rounded-xl border text-center transition-all ${
                  targetType === "ALL_STUDENTS"
                    ? "bg-blue-600 text-white font-bold border-blue-500 shadow-md shadow-blue-600/20"
                    : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                جميع الطلاب المسجلين
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetType("ACADEMIC_LEVEL");
                  if (levels.length > 0) setTargetId(levels[0].id);
                }}
                className={`p-3 rounded-xl border text-center transition-all ${
                  targetType === "ACADEMIC_LEVEL"
                    ? "bg-blue-600 text-white font-bold border-blue-500 shadow-md shadow-blue-600/20"
                    : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                دفعة دراسية معينة
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetType("SUBJECT_ENROLLED");
                  if (subjects.length > 0) setTargetId(subjects[0].id);
                }}
                className={`p-3 rounded-xl border text-center transition-all ${
                  targetType === "SUBJECT_ENROLLED"
                    ? "bg-blue-600 text-white font-bold border-blue-500 shadow-md shadow-blue-600/20"
                    : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                المشتركون في مادة معينة
              </button>
            </div>
          </div>

          {/* محدد الدفعة أو المادة إذا اختيرت */}
          {targetType === "ACADEMIC_LEVEL" && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">اختر الدفعة:</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetType === "SUBJECT_ENROLLED" && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">اختر المادة:</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.academicLevel?.name})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* نص الرسالة */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300">نص الرسالة (WhatsApp):</label>
              <span className="text-[10px] text-blue-400 font-mono">استخدم {"{name}"} لاسم الطالب تلقائياً</span>
            </div>
            <textarea
              required
              rows={6}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white leading-relaxed focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? "جاري الإرسال الجماعي..." : "إرسال الرسالة للجميع عبر واتساب"}</span>
          </button>
        </form>

        {/* المعاينة الحية */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 h-fit">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <MessageCircle className="w-4 h-4" />
            <span>معاينة شكل الرسالة كما ستصل للطالب:</span>
          </div>

          <div className="bg-[#0b141a] p-4 rounded-2xl border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans shadow-inner">
            <div className="bg-[#005c4b] p-3 rounded-xl text-white whitespace-pre-wrap rounded-br-none shadow-sm">
              {messageText.replace(/\{name\}/g, "أحمد محمود")}
            </div>
            <div className="text-[10px] text-slate-400 mt-2 text-left font-mono">
              {new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })} ✓✓
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
