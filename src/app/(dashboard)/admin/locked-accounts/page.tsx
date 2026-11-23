"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Mail,
  Smartphone,
  Globe,
  Clock,
  RefreshCw,
  X,
  FileText,
} from "lucide-react";

export default function LockedAccountsPage() {
  const [lockedStudents, setLockedStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // فورم فك الحظر
  const [actionType, setActionType] = useState<
    "UNLOCK_ONLY" | "CHANGE_EMAIL" | "AUTHORIZE_NEW_DEVICE" | "RESET_ALL_DEVICES"
  >("UNLOCK_ONLY");
  const [adminNotes, setAdminNotes] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newFingerprint, setNewFingerprint] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchLocked = () => {
    setLoading(true);
    fetch("/api/admin/locked-accounts")
      .then((res) => res.json())
      .then((data) => {
        setLockedStudents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchLocked();
  }, []);

  const openUnlockModal = (student: any) => {
    setSelectedStudent(student);
    setAdminNotes("");
    setActionType("UNLOCK_ONLY");
    setNewEmail(student.email);
    // اقتراح بصمة الجهاز المحاول إن وجدت في آخر audit
    const lastAudit = student.auditLogs?.[0];
    setNewFingerprint(lastAudit?.attemptedFingerprint || "");
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminNotes.trim()) {
      alert("برجاء كتابة ملاحظات الأدمن لتوثيق سبب فك الحظر");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/locked-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedStudent.id,
          adminNotes,
          actionType,
          newEmail: actionType === "CHANGE_EMAIL" ? newEmail : undefined,
          newDeviceFingerprint: actionType === "AUTHORIZE_NEW_DEVICE" ? newFingerprint : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "فشل تنفيذ فك الحظر");
        setSubmitting(false);
        return;
      }

      setSuccessMessage(`تم فك حظر حساب الطالب (${selectedStudent.name}) بنجاح وإرسال إشعار له.`);
      setSelectedStudent(null);
      fetchLocked();
    } catch {
      alert("حدث خطأ في الاتصال بالسيرفر");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* الترويسة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">إدارة الحسابات المحظورة أمنياً</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
              {lockedStudents.length} حساب
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            الحسابات التي تم قفلها تلقائياً بسبب محاولة دخول غير مصرحة. أنت فقط صاحب الصلاحية لفك الحظر.
          </p>
        </div>

        <button
          onClick={fetchLocked}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>تحديث القائمة</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* قائمة الحسابات المقفولة */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">جاري فحص السجلات...</div>
      ) : lockedStudents.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">المنصة مؤمنة بالكامل!</h3>
          <p className="text-xs text-slate-400">لا توجد أي حسابات محظورة حالياً. جميع الطلاب يعملون بأمان.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {lockedStudents.map((student) => {
            const lastAudit = student.auditLogs?.[0];
            return (
              <div
                key={student.id}
                className="bg-slate-900/90 border border-red-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* شريط أحمر جمالي جانبي */}
                <div className="absolute top-0 bottom-0 right-0 w-1.5 bg-red-600" />

                <div className="space-y-3 flex-1 pr-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-white">{student.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-blue-400">
                      {student.academicLevel?.name || "دفعة غير محددة"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                      موقوف أمنياً (LOCKED)
                    </span>
                  </div>

                  {/* بيانات الاتصال والربط */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <span className="font-mono text-slate-200" dir="ltr">
                        {student.phone || "بدون رقم"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span className="font-mono text-slate-200 truncate">{student.email}</span>
                    </div>
                  </div>

                  {/* تفاصيل الواقعة والـ Audit وتطابق نوع الفون والجيميل */}
                  {lastAudit && (
                    <div className="p-3 bg-red-950/30 border border-red-500/20 rounded-xl text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-red-400">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>سبب القفل: {lastAudit.reason}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 text-[11px] pt-1">
                        <span className="text-slate-300">
                          📱 نوع الفون المسجل: <strong className="text-white font-mono">{student.phoneType || "هاتف غير محدد"}</strong>
                        </span>
                        {lastAudit.attemptedDeviceModel && (
                          <span className="text-amber-400">
                            ⚠️ الفون المحاول: <strong className="font-mono">{lastAudit.attemptedDeviceModel}</strong>
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-1 font-mono">
                        <span>IP: {lastAudit.ipAddress}</span>
                        {lastAudit.attemptedEmail && lastAudit.attemptedEmail !== student.email && (
                          <span className="text-amber-300">جيميل محاول: {lastAudit.attemptedEmail}</span>
                        )}
                        <span>الوقت: {new Date(lastAudit.createdAt).toLocaleString("ar-EG")}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* زر فك الحظر والإجراء */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => openUnlockModal(student)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/30"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>فك الحظر وإدارة الحساب</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* مودال فك الحظر الاحترافي */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedStudent(null)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">فك حظر الطالب: {selectedStudent.name}</h3>
                <p className="text-xs text-slate-400">حدد الإجراء المناسب بعد التحدث مع الطالب والتحقق منه.</p>
              </div>
            </div>

            <form onSubmit={handleUnlockSubmit} className="space-y-4 text-xs">
              {/* خيارات الإجراء */}
              <div className="space-y-2">
                <label className="font-bold text-slate-300 block">اختر الإجراء المطلوب:</label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950/60 cursor-pointer">
                  <input
                    type="radio"
                    name="actionType"
                    checked={actionType === "UNLOCK_ONLY"}
                    onChange={() => setActionType("UNLOCK_ONLY")}
                    className="text-blue-600"
                  />
                  <div>
                    <div className="font-bold text-white">فك الحظر فقط</div>
                    <div className="text-[10px] text-slate-400">إعادة تفعيل الحساب بنفس بياناته وأجهزته السابقة.</div>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950/60 cursor-pointer">
                  <input
                    type="radio"
                    name="actionType"
                    checked={actionType === "CHANGE_EMAIL"}
                    onChange={() => setActionType("CHANGE_EMAIL")}
                    className="text-blue-600"
                  />
                  <div>
                    <div className="font-bold text-white">تغيير الجيميل المربوط بحساب الطالب</div>
                    <div className="text-[10px] text-slate-400">ربط رقم هاتفه بحساب Google جديد صرح به الطالب.</div>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950/60 cursor-pointer">
                  <input
                    type="radio"
                    name="actionType"
                    checked={actionType === "AUTHORIZE_NEW_DEVICE"}
                    onChange={() => setActionType("AUTHORIZE_NEW_DEVICE")}
                    className="text-blue-600"
                  />
                  <div>
                    <div className="font-bold text-white">تصريح بالجهاز الجديد</div>
                    <div className="text-[10px] text-slate-400">اعتماد بصمة الجهاز الجديد الذي حاول الطالب الدخول منه.</div>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950/60 cursor-pointer">
                  <input
                    type="radio"
                    name="actionType"
                    checked={actionType === "RESET_ALL_DEVICES"}
                    onChange={() => setActionType("RESET_ALL_DEVICES")}
                    className="text-blue-600"
                  />
                  <div>
                    <div className="font-bold text-white">مسح كافة الأجهزة السابقة (Reset Devices)</div>
                    <div className="text-[10px] text-slate-400">السماح بتسجيل جهازه القادم تلقائياً كجهاز وحيد.</div>
                  </div>
                </label>
              </div>

              {/* حقل إدخال الإيميل الجديد في حال اختياره */}
              {actionType === "CHANGE_EMAIL" && (
                <div>
                  <label className="block font-medium text-slate-300 mb-1">البريد الإلكتروني الجديد (Google):</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-blue-500"
                    placeholder="student.new@gmail.com"
                  />
                </div>
              )}

              {/* حقل بصمة الجهاز في حال التصريح */}
              {actionType === "AUTHORIZE_NEW_DEVICE" && (
                <div>
                  <label className="block font-medium text-slate-300 mb-1">بصمة الجهاز الجديد المراد اعتماده:</label>
                  <input
                    type="text"
                    required
                    value={newFingerprint}
                    onChange={(e) => setNewFingerprint(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white text-[11px] focus:outline-none focus:border-blue-500"
                    placeholder="بصمة الجهاز المستخرجة من الـ AuditLog"
                  />
                </div>
              )}

              {/* ملاحظات الأدمن الإلزامية للـ Audit */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">ملاحظات الأدمن (سجل التدقيق الأمني):</label>
                <textarea
                  required
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="مثال: تم التواصل هاتفياً مع الطالب وأكد أنه قام بتغيير هاتفه الشخصي وتم التحقق من هويته."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  {submitting ? "جاري الحفظ..." : "تأكيد وفك الحظر الآن"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
