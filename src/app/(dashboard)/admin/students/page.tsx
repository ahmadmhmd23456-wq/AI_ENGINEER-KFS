"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  BookOpen,
  CheckCircle2,
  Trash2,
  RotateCcw,
  PlusCircle,
  ExternalLink,
  Sliders,
  DollarSign,
  AlertTriangle,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";

const DEPT_LABELS: Record<string, string> = {
  GENERAL: "مواد عامة",
  AI: "ذكاء اصطناعي",
  MECHATRONICS: "ميكاترونكس",
  ARCHITECTURE: "هندسة معمارية",
  CIVIL: "هندسة مدنية",
  ALL: "جميع الأقسام",
};

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // الفلاتر
  const [search, setSearch] = useState("");
  const [levelId, setLevelId] = useState("");
  const [status, setStatus] = useState("");

  // مودال التحكم بالأجهزة
  const [selectedStudentForDevices, setSelectedStudentForDevices] = useState<any | null>(null);
  const [deviceActionLoading, setDeviceActionLoading] = useState(false);

  // مودال إدارة المواد والشحن
  const [selectedStudentForSubjects, setSelectedStudentForSubjects] = useState<any | null>(null);
  const [subjectActionLoading, setSubjectActionLoading] = useState<string | null>(null);
  const [modalSubjectSearch, setModalSubjectSearch] = useState("");
  const [modalSubjectScope, setModalSubjectScope] = useState<"STUDENT_MATCH" | "LEVEL_ALL" | "ALL">("STUDENT_MATCH");

  const openStudentSubjectsModal = (student: any) => {
    setSelectedStudentForSubjects(student);
    setModalSubjectSearch("");
    setModalSubjectScope("STUDENT_MATCH");
  };

  // مودال تعديل البريد
  const [selectedStudentForEmail, setSelectedStudentForEmail] = useState<any | null>(null);
  const [newEmail, setNewEmail] = useState("");

  // مودال تعديل الفرقة والقسم الهندسي
  const [selectedStudentForAcademic, setSelectedStudentForAcademic] = useState<any | null>(null);
  const [editLevelId, setEditLevelId] = useState("");
  const [editDepartment, setEditDepartment] = useState("GENERAL");

  // مودال تعيين كلمة المرور
  const [selectedStudentForPassword, setSelectedStudentForPassword] = useState<any | null>(null);
  const [newStudentPassword, setNewStudentPassword] = useState("");
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);

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
        setSubjects(data.subjects || []);

        // تحديث المودالات المفتوحة بالبيانات الجديدة إن وجدت
        if (selectedStudentForDevices) {
          const updated = (data.students || []).find((s: any) => s.id === selectedStudentForDevices.id);
          if (updated) setSelectedStudentForDevices(updated);
        }
        if (selectedStudentForSubjects) {
          const updated = (data.students || []).find((s: any) => s.id === selectedStudentForSubjects.id);
          if (updated) setSelectedStudentForSubjects(updated);
        }

        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, levelId, status]);

  // قفل أو فك حظر حساب الطالب
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

  // فتح أو إغلاق مادة محددة للطالب (شحن يدوي)
  const handleToggleSubject = async (studentId: string, subjectId: string, grant: boolean) => {
    setSubjectActionLoading(subjectId);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: studentId,
          action: "TOGGLE_SUBJECT",
          subjectId,
          grant,
        }),
      });

      if (res.ok) {
        fetchStudents();
      } else {
        const err = await res.json();
        alert(err.error || "فشل تعديل حالة المادة");
      }
    } catch {
      alert("خطأ في الاتصال بالخادم");
    } finally {
      setSubjectActionLoading(null);
    }
  };

  // حذف جهاز محدد لطالب
  const handleDeleteDevice = async (studentId: string, deviceId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الجهاز؟ سيتمكن الطالب من تسجيل جهاز آخر.")) return;
    setDeviceActionLoading(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: studentId,
          action: "DELETE_DEVICE",
          deviceId,
        }),
      });

      if (res.ok) {
        fetchStudents();
      } else {
        alert("فشل حذف الجهاز");
      }
    } catch {
      alert("خطأ في الاتصال بالخادم");
    } finally {
      setDeviceActionLoading(false);
    }
  };

  // إعادة ضبط شامل للأجهزة وفك الحظر
  const handleResetAllDevices = async (studentId: string) => {
    if (!confirm("هل ترغب في مسح كافة الأجهزة وإلغاء بصمة الهاتف القديمة وفك الحظر إن وجد؟")) return;
    setDeviceActionLoading(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: studentId,
          action: "RESET_ALL_DEVICES",
        }),
      });

      if (res.ok) {
        fetchStudents();
      } else {
        alert("فشل إعادة ضبط الأجهزة");
      }
    } catch {
      alert("خطأ في الاتصال");
    } finally {
      setDeviceActionLoading(false);
    }
  };

  // تعديل الحد الأقصى للأجهزة المسموح بها للطالب
  const handleUpdateMaxDevices = async (studentId: string, maxAllowedDevices: number) => {
    setDeviceActionLoading(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: studentId,
          action: "UPDATE_MAX_DEVICES",
          maxAllowedDevices,
        }),
      });

      if (res.ok) {
        fetchStudents();
      }
    } catch {
      alert("فشل تحديث الحد الأقصى");
    } finally {
      setDeviceActionLoading(false);
    }
  };

  // تعديل البريد الإلكتروني
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

  // تعيين كلمة المرور الجديدة للطالب
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForPassword || !newStudentPassword) return;
    if (newStudentPassword.length < 6) {
      alert("كلمة المرور يجب ألا تقل عن 6 أحرف");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedStudentForPassword.id,
          action: "RESET_PASSWORD",
          newPassword: newStudentPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPasswordSuccessMessage(`تم تعيين كلمة المرور (${newStudentPassword}) بنجاح! يمكنك الآن نسخ الرسالة وإرسالها للطالب.`);
        fetchStudents();
      } else {
        alert(data.error || "فشل تعيين كلمة المرور");
      }
    } catch {
      alert("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  };

  // حفظ تعديل الفرقة والقسم الهندسي للطالب
  const handleUpdateAcademic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForAcademic || !editLevelId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedStudentForAcademic.id,
          action: "UPDATE_LEVEL_AND_DEPARTMENT",
          academicLevelId: editLevelId,
          department: editDepartment,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedStudentForAcademic(null);
        fetchStudents();
      } else {
        alert(data.error || "فشل تحديث الفرقة والقسم");
      }
    } catch {
      alert("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* الترويسة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة حسابات وأجهزة الطلاب والمواد</h1>
          <p className="text-xs text-slate-400 mt-1">
            التحكم بالأجهزة المتصلة بكل طالب، وإلغاء أو فتح المواد والمحاضرات المشحونة بنقرة واحدة.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/admin/search"
            className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all"
          >
            <Search className="w-4 h-4" />
            <span>البحث الشامل</span>
          </Link>

          <button
            onClick={fetchStudents}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>تحديث</span>
          </button>
        </div>
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
        <div className="text-center py-12 text-slate-400 text-xs">جاري جلب سجلات الطلاب والأجهزة...</div>
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
                <th className="py-3 px-4">الدفعة والقسم</th>
                <th className="py-3 px-4">الهاتف (واتساب)</th>
                <th className="py-3 px-4">الأجهزة المرتبطة</th>
                <th className="py-3 px-4">المواد والشحن</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-left">لوحة التحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {students.map((student) => {
                const isLocked = student.status === "LOCKED";
                const purchasedSubjectIds = new Set(
                  (student.purchases || []).map((p: any) => p.subjectId)
                );
                const openCount = student._count?.purchases || purchasedSubjectIds.size;
                const devicesCount = student.devices?.length || 0;

                return (
                  <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      {student.name}
                      <span className="block text-[10px] text-slate-400 font-mono truncate max-w-xs">
                        {student.email}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-blue-400 font-medium">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentForAcademic(student);
                          setEditLevelId(student.academicLevelId || levels[0]?.id || "");
                          setEditDepartment(student.department || "GENERAL");
                        }}
                        className="text-right group hover:bg-slate-800/60 p-1.5 rounded-xl border border-transparent hover:border-slate-700 transition-all"
                        title="انقر لتعديل الفرقة أو القسم الهندسي للطالب"
                      >
                        <div className="flex items-center gap-1">
                          <span>{student.academicLevel?.name || "غير محدد"}</span>
                          <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-blue-400" />
                        </div>
                        <span className="text-[10px] text-indigo-300 font-medium block">
                          {student.department
                            ? DEPT_LABELS[student.department] || student.department
                            : "لم يُحدد قسم"}
                        </span>
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300" dir="ltr">
                      {student.phone || "بدون رقم"}
                    </td>
                    {/* عمود الأجهزة مع زر التحكم */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedStudentForDevices(student)}
                        className="flex flex-col gap-1 text-right group p-1.5 rounded-xl hover:bg-slate-800/60 transition-all border border-transparent hover:border-slate-700"
                        title="انقر لإدارة أجهزة الطالب وحذف الجهاز القديم"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded-lg border border-blue-800/50 group-hover:border-blue-500">
                            <Smartphone className="w-3 h-3 text-blue-400" />
                            <span>{student.phoneType || "هاتف محمول"}</span>
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          الجلسات: <span className="font-bold text-white">{devicesCount}</span> / {student.maxAllowedDevices} جهاز
                          <Sliders className="w-2.5 h-2.5 text-blue-400" />
                        </span>
                      </button>
                    </td>

                    {/* عمود المواد والشحن */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openStudentSubjectsModal(student)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 hover:bg-indigo-900/60 hover:text-white transition-all text-[11px] font-medium"
                        title="انقر لفتح أو قفل المواد لهذا الطالب"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{openCount} مواد مفتوحة</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1 rounded border border-emerald-800/40 font-bold">
                          شحن/تعديل
                        </span>
                      </button>
                    </td>

                    {/* الحالة */}
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

                    {/* الإجراءات */}
                    <td className="py-3 px-4 text-left">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* زر فتح المواد */}
                        <button
                          onClick={() => openStudentSubjectsModal(student)}
                          className="p-1.5 bg-blue-950/80 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-800/50 rounded-lg transition-all"
                          title="شحن وفتح المواد للطالب"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>

                        {/* زر إدارة الأجهزة */}
                        <button
                          onClick={() => setSelectedStudentForDevices(student)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                          title="التحكم بأجهزة الهاتف المربوطة"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>

                        {/* تعديل البريد */}
                        <button
                          onClick={() => {
                            setSelectedStudentForEmail(student);
                            setNewEmail(student.email);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                          title="تعديل حساب Google"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* تعيين كلمة مرور جديدة للطالب */}
                        <button
                          onClick={() => {
                            setSelectedStudentForPassword(student);
                            setNewStudentPassword("12345678");
                            setPasswordCopied(false);
                            setPasswordSuccessMessage(null);
                          }}
                          className="p-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 rounded-lg transition-all"
                          title="تعيين كلمة مرور جديدة للطالب (Reset Password)"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        {/* قفل / فك الحظر */}
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

      {/* 1. مودال التحكم بأجهزة الطالب */}
      {selectedStudentForDevices && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedStudentForDevices(null)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">التحكم في أجهزة الطالب</h3>
                <p className="text-xs text-slate-400">
                  الطالب: <span className="text-blue-400 font-bold">{selectedStudentForDevices.name}</span>
                </p>
              </div>
            </div>

            {/* إعدادات الحد الأقصى للأجهزة */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">عدد الأجهزة المسموح بها للطالب:</div>
                <div className="text-[11px] text-slate-400">
                  افتراضياً جهاز واحد لمنع مشاركة الحسابات بين الطلاب.
                </div>
              </div>
              <select
                disabled={deviceActionLoading}
                value={selectedStudentForDevices.maxAllowedDevices || 1}
                onChange={(e) =>
                  handleUpdateMaxDevices(selectedStudentForDevices.id, parseInt(e.target.value, 10))
                }
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-blue-500"
              >
                <option value={1}>1 جهاز (موصى به)</option>
                <option value={2}>2 أجهزة</option>
                <option value={3}>3 أجهزة</option>
              </select>
            </div>

            {/* قائمة الأجهزة المتصلة */}
            <div className="space-y-3 mb-5 max-h-60 overflow-y-auto pr-1">
              <div className="text-xs font-bold text-slate-300">الأجهزة المسجلة حالياً:</div>

              {(!selectedStudentForDevices.devices || selectedStudentForDevices.devices.length === 0) ? (
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                  لا يوجد أجهزة مسجلة حالياً لهذا الطالب.
                </div>
              ) : (
                selectedStudentForDevices.devices.map((device: any) => (
                  <div
                    key={device.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-bold text-white">
                          {device.deviceModel || device.deviceName || "هاتف محمول"}
                        </span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/40">
                          متصل
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        IP: {device.ipAddress} • آخر نشاط: {new Date(device.lastActiveAt).toLocaleString("ar-EG")}
                      </div>
                    </div>

                    <button
                      disabled={deviceActionLoading}
                      onClick={() => handleDeleteDevice(selectedStudentForDevices.id, device.id)}
                      className="p-2 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600 rounded-lg transition-all"
                      title="حذف هذا الجهاز للسماح بجهاز جديد"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* إجراءات شاملة */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                disabled={deviceActionLoading}
                onClick={() => handleResetAllDevices(selectedStudentForDevices.id)}
                className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-600 text-amber-400 hover:text-white border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط كل الأجهزة وفك الحظر</span>
              </button>

              <button
                onClick={() => setSelectedStudentForDevices(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-medium"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. مودال إدارة المواد والشحن للطالب */}
      {selectedStudentForSubjects && (() => {
        const studentLevelId = selectedStudentForSubjects.academicLevelId;
        const studentLevelName = selectedStudentForSubjects.academicLevel?.name || "غير محدد";
        const studentDept = selectedStudentForSubjects.department;
        const studentDeptLabel = studentDept ? (DEPT_LABELS[studentDept] || studentDept) : null;

        const filteredSubjects = subjects.filter((sub) => {
          const isAlreadyPurchased = (selectedStudentForSubjects.purchases || []).some(
            (p: any) => p.subjectId === sub.id
          );

          if (modalSubjectScope === "STUDENT_MATCH") {
            if (studentLevelId && sub.academicLevelId !== studentLevelId && !isAlreadyPurchased) {
              return false;
            }
            if (
              studentDept &&
              studentDept !== "ALL" &&
              sub.department !== studentDept &&
              sub.department !== "GENERAL" &&
              !isAlreadyPurchased
            ) {
              return false;
            }
          } else if (modalSubjectScope === "LEVEL_ALL") {
            if (studentLevelId && sub.academicLevelId !== studentLevelId && !isAlreadyPurchased) {
              return false;
            }
          }

          if (!modalSubjectSearch.trim()) return true;
          const term = modalSubjectSearch
            .toLowerCase()
            .replace(/[أإآ]/g, "ا")
            .replace(/ة/g, "ه")
            .replace(/ى/g, "ي")
            .trim();
          const name = (sub.name || "")
            .toLowerCase()
            .replace(/[أإآ]/g, "ا")
            .replace(/ة/g, "ه")
            .replace(/ى/g, "ي");
          const dept = (sub.department || "").toLowerCase();
          const deptAr = (DEPT_LABELS[sub.department] || "").toLowerCase();
          const levelName = (sub.academicLevel?.name || "").toLowerCase();
          return (
            name.includes(term) ||
            dept.includes(term) ||
            deptAr.includes(term) ||
            levelName.includes(term)
          );
        });

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative">
              <button
                onClick={() => setSelectedStudentForSubjects(null)}
                className="absolute top-5 left-5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">إدارة المواد والشحن للطالب</h3>
                  <p className="text-xs text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span>الطالب: <span className="text-emerald-400 font-bold">{selectedStudentForSubjects.name}</span></span>
                    <span>•</span>
                    <span>الفرقة: <span className="text-blue-400 font-bold">{studentLevelName}</span></span>
                    {studentDeptLabel && (
                      <>
                        <span>•</span>
                        <span>القسم: <span className="text-indigo-300 font-bold">{studentDeptLabel}</span></span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* فلاتر عرض المواد (افتراضياً: مواد الطالب حسب فرقته وقسمه) */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={() => setModalSubjectScope("STUDENT_MATCH")}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                    modalSubjectScope === "STUDENT_MATCH"
                      ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/40"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  مواد الطالب ({studentLevelName}{studentDeptLabel ? ` • ${studentDeptLabel}` : ""})
                </button>

                {studentLevelId && studentDept && studentDept !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => setModalSubjectScope("LEVEL_ALL")}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                      modalSubjectScope === "LEVEL_ALL"
                        ? "bg-blue-600/20 text-blue-300 border-blue-500/40"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    كل مواد {studentLevelName}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setModalSubjectScope("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                    modalSubjectScope === "ALL"
                      ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  كل مواد المنصة
                </button>
              </div>

              {/* حقل البحث داخل المواد */}
              <div className="relative mb-3">
                <input
                  type="text"
                  value={modalSubjectSearch}
                  onChange={(e) => setModalSubjectSearch(e.target.value)}
                  placeholder="ابحث عن مادة محددة بالاسم أو القسم أو الترم..."
                  className="w-full py-2 pr-8 pl-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute top-2.5 right-2.5 pointer-events-none" />
              </div>

              {/* قائمة المواد وتفعيلها بنقرة واحدة */}
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 mb-5">
                {filteredSubjects.length === 0 ? (
                  <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-2xl text-center space-y-2">
                    <p className="text-xs text-slate-400">
                      لا توجد مواد مضافة في هذه الفرقة / القسم حالياً.
                    </p>
                    {modalSubjectScope !== "ALL" && (
                      <button
                        type="button"
                        onClick={() => setModalSubjectScope("ALL")}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-blue-400 font-semibold"
                      >
                        عرض جميع مواد المنصة
                      </button>
                    )}
                  </div>
                ) : (
                  filteredSubjects.map((sub) => {
                    const isPurchased = (selectedStudentForSubjects.purchases || []).some(
                      (p: any) => p.subjectId === sub.id
                    );
                    const isThisLoading = subjectActionLoading === sub.id;

                    return (
                      <div
                        key={sub.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                          isPurchased
                            ? "bg-emerald-950/20 border-emerald-800/40 text-slate-200"
                            : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-sm text-white flex flex-wrap items-center gap-1.5">
                            <span>{sub.name}</span>
                            {sub.academicLevel?.name && (
                              <span className="text-[10px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                                {sub.academicLevel.name}
                              </span>
                            )}
                            {sub.department && (
                              <span className="text-[10px] text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                                {DEPT_LABELS[sub.department] || sub.department}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            سعر المادة: <span className="font-mono text-emerald-400">{sub.price} ج.م</span> • الترم {sub.term}
                          </div>
                        </div>

                        <div>
                          {isPurchased ? (
                            <button
                              disabled={isThisLoading}
                              onClick={() => handleToggleSubject(selectedStudentForSubjects.id, sub.id, false)}
                              className="px-3.5 py-2 bg-emerald-600/20 hover:bg-red-600 text-emerald-400 hover:text-white border border-emerald-600/40 hover:border-red-600 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 whitespace-nowrap"
                              title="المادة مفعلة للطالب، انقر لإلغاء تفعيلها وقفلها"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isThisLoading ? "جاري القفل..." : "مفعلة (انقر للقفل)"}</span>
                            </button>
                          ) : (
                            <button
                              disabled={isThisLoading}
                              onClick={() => handleToggleSubject(selectedStudentForSubjects.id, sub.id, true)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center gap-1.5 whitespace-nowrap"
                              title="انقر لشحن وفتح المادة للطالب فوراً"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>{isThisLoading ? "جاري الشحن..." : "فتح وشحن المادة"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedStudentForSubjects(null)}
                  className="px-5 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-medium"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. مودال تغيير الجيميل المربوط */}
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

      {/* 4. مودال تعيين كلمة مرور جديدة للطالب */}
      {selectedStudentForPassword && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedStudentForPassword(null)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">تعيين كلمة مرور جديدة للطالب</h3>
                <p className="text-xs text-slate-400">
                  للطالب: <span className="text-white font-bold">{selectedStudentForPassword.name}</span>
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl mb-4 text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>البريد الإلكتروني:</span>
                <span className="text-slate-200 font-mono" dir="ltr">{selectedStudentForPassword.email}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>رقم الهاتف:</span>
                <span className="text-slate-200 font-mono" dir="ltr">{selectedStudentForPassword.phone}</span>
              </div>
            </div>

            {passwordSuccessMessage ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{passwordSuccessMessage}</span>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                  <p className="text-slate-400 text-[11px] font-medium">رسالة جاهزة للإرسال للطالب عبر الواتساب:</p>
                  <p className="p-2.5 bg-slate-900 rounded-xl text-slate-200 font-mono text-[11px] select-all leading-relaxed" dir="rtl">
                    مرحباً بك يا {selectedStudentForPassword.name}،<br />
                    تم تحديث بيانات دخولك لمنصة هندسة:<br />
                    - الحساب: {selectedStudentForPassword.email}<br />
                    - كلمة المرور الجديدة: {newStudentPassword}<br />
                    رابط المنصة: https://eng-academy-eg.vercel.app
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const msg = `مرحباً بك يا ${selectedStudentForPassword.name}،\nتم تحديث بيانات دخولك لمنصة هندسة:\n- الحساب: ${selectedStudentForPassword.email}\n- كلمة المرور الجديدة: ${newStudentPassword}\nرابط المنصة: https://eng-academy-eg.vercel.app`;
                      navigator.clipboard.writeText(msg);
                      setPasswordCopied(true);
                      setTimeout(() => setPasswordCopied(false), 3000);
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                  >
                    {passwordCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{passwordCopied ? "تم نسخ الرسالة بنجاح!" : "نسخ الرسالة لإرسالها بالواتساب"}</span>
                  </button>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStudentForPassword(null)}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 font-medium">كلمة المرور الجديدة:</label>
                    <button
                      type="button"
                      onClick={() => {
                        const randomPass = "Pass@" + Math.floor(1000 + Math.random() * 9000);
                        setNewStudentPassword(randomPass);
                      }}
                      className="text-amber-400 hover:text-amber-300 text-[11px] underline"
                    >
                      توليد كلمة سر تلقائية
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={newStudentPassword}
                    onChange={(e) => setNewStudentPassword(e.target.value)}
                    placeholder="مثال: 12345678 أو Pass@1234"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-amber-500"
                    dir="ltr"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    سيتم تشفير كلمة المرور وتعيينها فوراً، وسيتمكن الطالب من الدخول بها مباشرة.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedStudentForPassword(null)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl disabled:opacity-50 transition-all flex items-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{submitting ? "جاري التعيين..." : "تعيين وحفظ كلمة المرور"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 5. مودال تعديل الفرقة والقسم الهندسي (الأدمن فقط) */}
      {selectedStudentForAcademic && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedStudentForAcademic(null)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">تعديل الفرقة والقسم الهندسي</h3>
                <p className="text-xs text-slate-400">
                  للطالب: <span className="text-white font-bold">{selectedStudentForAcademic.name}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateAcademic} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">الفرقة الدراسية:</label>
                <select
                  value={editLevelId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setEditLevelId(nextId);
                    const lvl = levels.find((l) => l.id === nextId);
                    if (lvl?.slug === "prep") {
                      setEditDepartment("GENERAL");
                    }
                  }}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                >
                  {levels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.name}
                    </option>
                  ))}
                </select>
              </div>

              {levels.find((l) => l.id === editLevelId)?.slug !== "prep" && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">القسم الهندسي:</label>
                  <select
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="AI">ذكاء اصطناعي (AI)</option>
                    <option value="MECHATRONICS">ميكاترونكس</option>
                    <option value="ARCHITECTURE">هندسة معمارية</option>
                    <option value="CIVIL">هندسة مدنية / إنشائية</option>
                    <option value="GENERAL">مواد عامة</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForAcademic(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {submitting ? "جاري الحفظ..." : "حفظ التعديل"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
