"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  Lock,
  Unlock,
  Edit2,
  Phone,
  Mail,
  GraduationCap,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  X,
} from "lucide-react";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // الفلاتر
  const [search, setSearch] = useState("");
  const [levelId, setLevelId] = useState("");
  const [status, setStatus] = useState("");

  // مودال تعديل البريد
  const [selectedStudentForEmail, setSelectedStudentForEmail] = useState<any | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchStudents = () => {
    setLoading(true);
    let url = "/api/admin/students";
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (levelId) params.append("levelId", levelId);
    if (status) params.append("status", status);
    if (params.toString()) url += `?${params.toString()}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setStudents(data.students || []);
        setLevels(data.levels || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchStudents();
  }, [levelId, status]);

  const handleToggleLock = async (student: any) => {
    const isCurrentlyLocked = student.status === "LOCKED";
    const confirmMsg = isCurrentlyLocked
      ? `هل ترغب في فك الحظر عن الطالب "${student.name}"؟`
      : `هل ترغب في قفل حساب الطالب "${student.name}" فوراً؟`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: student.id,
          action: "TOGGLE_LOCK",
        }),
      });

      if (res.ok) fetchStudents();
    } catch {
      alert("حدث خطأ بالاتصال");
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !selectedStudentForEmail) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedStudentForEmail.id,
          action: "CHANGE_EMAIL",
          newEmail,
        }),
      });

      if (res.ok) {
        setSelectedStudentForEmail(null);
        fetchStudents();
      } else {
        alert("فشل تحديث البريد");
      }
    } catch {
      alert("حدث خطأ أثناء التحديث");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* الترويسة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة حسابات الطلاب</h1>
          <p className="text-xs text-slate-400 mt-1">
            البحث في سجلات الطلاب، مراجعة الأجهزة المرتبطة، وتعديل الحسابات المقفولة.
          </p>
        </div>

        <button
          onClick={fetchStudents}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>تحديث</span>
        </button>
      </div>

      {/* شريط الفلاتر والبحث */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* فلتر الدفعة */}
          <select
            value={levelId}
            onChange={(e) => setLevelId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">جميع الدفعات</option>
            {levels.map((lvl) => (
              <option key={lvl.id} value={lvl.id}>
                {lvl.name}
              </option>
            ))}
          </select>

          {/* فلتر الحالة */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">جميع الحالات</option>
            <option value="ACTIVE">نشط</option>
            <option value="LOCKED">مقفول أمنياً</option>
          </select>
        </div>

        {/* حقل البحث */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchStudents();
          }}
          className="relative w-full md:w-72"
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف أو البريد..."
            className="w-full py-2 pr-9 pl-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute top-2.5 right-3" />
        </form>
      </div>

      {/* جدول الطلاب */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">جاري البحث في قاعدة البيانات...</div>
      ) : students.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">لا يوجد طلاب مطابقين للبحث</h3>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">الطالب</th>
                <th className="py-3 px-4">الدفعة</th>
                <th className="py-3 px-4">الهاتف (واتساب)</th>
                <th className="py-3 px-4">الأجهزة</th>
                <th className="py-3 px-4">المشتريات والامتحانات</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {students.map((student) => {
                const isLocked = student.status === "LOCKED";
                return (
                  <tr key={student.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-white">
                      {student.name}
                      <span className="block text-[10px] text-slate-400 font-mono truncate max-w-xs">
                        {student.email}
                      </span>
                      {student.initialEmail && student.initialEmail !== student.email && (
                        <span className="block text-[9px] text-amber-400 font-mono">
                          الجيميل الأصلي: {student.initialEmail}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-blue-400 font-medium">
                      {student.academicLevel?.name || "غير محدد"}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300" dir="ltr">
                      {student.phone || "بدون رقم"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-800/40 w-fit">
                          <Smartphone className="w-3 h-3 text-blue-400" />
                          <span>{student.phoneType || "هاتف محمول"}</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          الجلسات: {student.devices?.length || 1} / {student.maxAllowedDevices}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <span>{student._count.purchases} مواد</span>
                      <span className="text-slate-500 mx-1">•</span>
                      <span>{student._count.examAttempts} امتحانات</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isLocked
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {isLocked ? "مقفول أمنياً" : "نشط"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-left">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedStudentForEmail(student);
                            setNewEmail(student.email);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                          title="تعديل حساب Google"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleLock(student)}
                          className={`p-1.5 rounded-lg transition-all ${
                            isLocked
                              ? "bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white"
                              : "bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white"
                          }`}
                          title={isLocked ? "فك الحظر" : "قفل الحساب"}
                        >
                          {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* مودال تغيير الجيميل المربوط */}
      {selectedStudentForEmail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedStudentForEmail(null)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-2">تعديل حساب Google المربوط</h3>
            <p className="text-xs text-slate-400 mb-4">
              للطالب: <span className="text-white font-bold">{selectedStudentForEmail.name}</span>
            </p>

            <form onSubmit={handleUpdateEmail} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">البريد الجديد (Google Gmail):</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-blue-500"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForEmail(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {submitting ? "جاري الحفظ..." : "حفظ البريد"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
