"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Search,
  Users,
  Smartphone,
  BookOpen,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Sliders,
  PlusCircle,
  X,
  Phone,
  Mail,
  Filter,
  Lock,
  Unlock,
  MessageCircle,
  Sparkles,
  RefreshCw,
  LayoutGrid,
  List,
} from "lucide-react";

export default function AdminSearchPage() {
  const [query, setQuery] = useState("");
  const [levelId, setLevelId] = useState("ALL");
  const [department, setDepartment] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [hasPurchases, setHasPurchases] = useState("ALL");
  const [deviceFilter, setDeviceFilter] = useState("");

  const [viewMode, setViewMode] = useState<"CARDS" | "TABLE">("CARDS");

  const [students, setStudents] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalStudents: 0, totalActive: 0, totalLocked: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // المودالات
  const [selectedStudentForDevices, setSelectedStudentForDevices] = useState<any | null>(null);
  const [deviceActionLoading, setDeviceActionLoading] = useState(false);
  const [selectedStudentForSubjects, setSelectedStudentForSubjects] = useState<any | null>(null);
  const [subjectActionLoading, setSubjectActionLoading] = useState<string | null>(null);
  const [modalSubjectSearch, setModalSubjectSearch] = useState("");

  const fetchSearchResults = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.append("q", query);
    if (levelId && levelId !== "ALL") params.append("levelId", levelId);
    if (department && department !== "ALL") params.append("department", department);
    if (status && status !== "ALL") params.append("status", status);
    if (hasPurchases && hasPurchases !== "ALL") params.append("hasPurchases", hasPurchases);
    if (deviceFilter) params.append("deviceType", deviceFilter);

    fetch(`/api/admin/search?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setStudents(data.students || []);
        setLevels(data.levels || []);
        setSubjects(data.subjects || []);
        setStats(data.stats || { totalStudents: 0, totalActive: 0, totalLocked: 0 });
        setTotalCount(data.totalCount || 0);

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

  // البحث التلقائي الفوري عند الكتابة أو تغيير الفلاتر مع Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSearchResults();
    }, 250);
    return () => clearTimeout(timer);
  }, [query, levelId, department, status, hasPurchases, deviceFilter]);

  // فتح أو قفل مادة للطالب
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
        fetchSearchResults();
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

  // حذف جهاز محدد
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
        fetchSearchResults();
      }
    } catch {
      alert("خطأ في الاتصال");
    } finally {
      setDeviceActionLoading(false);
    }
  };

  // مسح كافة الأجهزة وفك الحظر
  const handleResetAllDevices = async (studentId: string) => {
    if (!confirm("هل ترغب في مسح كل الأجهزة وإعادة ضبط بصمة الهاتف وفك الحظر إن وجد؟")) return;
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
        fetchSearchResults();
      }
    } catch {
      alert("خطأ في الاتصال");
    } finally {
      setDeviceActionLoading(false);
    }
  };

  // تعديل الحد الأقصى للأجهزة
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

      if (res.ok) fetchSearchResults();
    } catch {
      alert("فشل تحديث الحد الأقصى");
    } finally {
      setDeviceActionLoading(false);
    }
  };

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

      if (res.ok) fetchSearchResults();
    } catch {
      alert("حدث خطأ بالاتصال");
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* الترويسة وبطاقات الإحصاء السريعة */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Search className="w-6 h-6 text-blue-500" />
            <span>البحث الشامل في الطلاب والأجهزة والمواد</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            محرك بحث ذكي وسريع للبحث في آلاف الطلاب بالاسم، الهاتف، الجيميل، نوع الجهاز، أو عنوان IP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* تبديل طريقة العرض */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewMode("CARDS")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "CARDS" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
              title="عرض البطاقات المفصلة"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("TABLE")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "TABLE" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
              title="عرض الجدول المدمج"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fetchSearchResults}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* شريط الإحصائيات الفورية */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
          <div className="text-[11px] text-slate-400">إجمالي طلاب المنصة</div>
          <div className="text-xl font-bold text-white font-mono mt-0.5">{stats.totalStudents}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
          <div className="text-[11px] text-emerald-400">نتائج البحث الحالية</div>
          <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{totalCount}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
          <div className="text-[11px] text-blue-400">الطلاب النشطين</div>
          <div className="text-xl font-bold text-blue-400 font-mono mt-0.5">{stats.totalActive}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
          <div className="text-[11px] text-red-400">المقفولين أمنياً</div>
          <div className="text-xl font-bold text-red-400 font-mono mt-0.5">{stats.totalLocked}</div>
        </div>
      </div>

      {/* صندوق البحث الرئيسي المتقدم */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
        {/* حقل البحث الكبير */}
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم، رقم الهاتف، الجيميل، نوع الفون (مثال: Realme, iPhone, Samsung)، أو عنوان IP..."
            className="w-full py-4 pr-12 pl-12 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-inner"
            autoFocus
          />
          <Search className="w-5 h-5 text-blue-400 absolute top-4 right-4 pointer-events-none" />

          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute top-4 left-4 text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* فلاتر التصفية السريعة */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* فلتر الدفعة */}
          <select
            value={levelId}
            onChange={(e) => setLevelId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">جميع الدفعات</option>
            {levels.map((lvl) => (
              <option key={lvl.id} value={lvl.id}>
                {lvl.name}
              </option>
            ))}
          </select>

          {/* فلتر القسم الهندسي */}
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">جميع الأقسام الهندسية</option>
            <option value="AI">ذكاء اصطناعي (AI)</option>
            <option value="MECHATRONICS">ميكاترونكس (Mechatronics)</option>
            <option value="ARCHITECTURE">عمارة (Architecture)</option>
            <option value="CIVIL">مدني (Civil)</option>
          </select>

          {/* فلتر الحالة الأمنية */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">جميع الحالات</option>
            <option value="ACTIVE">نشط فقط</option>
            <option value="LOCKED">مقفول أمنياً فقط</option>
          </select>

          {/* فلتر الشحن والمواد */}
          <select
            value={hasPurchases}
            onChange={(e) => setHasPurchases(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">حالة المواد (الكل)</option>
            <option value="true">شاحن مواد (لديه اشتراك)</option>
            <option value="false">لم يشحن بعد (0 مواد)</option>
          </select>

          {/* فلاتر الأجهزة السريعة */}
          <div className="flex items-center gap-1 text-xs pr-2 border-r border-slate-800">
            <span className="text-[11px] text-slate-500">أجهزة سريعة:</span>
            {["Realme", "iPhone", "Samsung", "Xiaomi"].map((brand) => (
              <button
                key={brand}
                onClick={() => setDeviceFilter(deviceFilter === brand ? "" : brand)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  deviceFilter === brand
                    ? "bg-blue-600 text-white font-bold"
                    : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {brand}
              </button>
            ))}
            {deviceFilter && (
              <button
                onClick={() => setDeviceFilter("")}
                className="text-[11px] text-red-400 hover:underline px-1"
              >
                مسح
              </button>
            )}
          </div>
        </div>
      </div>

      {/* نتائج البحث */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs">جاري البحث في قاعدة البيانات...</div>
      ) : students.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-16 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">لم يتم العثور على أي طالب يطابق البحث</h3>
          <p className="text-xs text-slate-400">
            جرّب البحث بجزء من الاسم أو رقم الهاتف، أو تأكد من إزالة الفلاتر المحددة.
          </p>
        </div>
      ) : viewMode === "CARDS" ? (
        /* عرض البطاقات المفصلة السريعة */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => {
            const isLocked = student.status === "LOCKED";
            const purchasesList = student.purchases || [];
            const openSubjectsCount = purchasesList.length;
            const primaryDevice = student.devices?.[0];

            return (
              <div
                key={student.id}
                className={`bg-slate-900/90 border rounded-3xl p-5 shadow-xl transition-all hover:border-slate-700 flex flex-col justify-between ${
                  isLocked ? "border-red-900/50 bg-red-950/10" : "border-slate-800"
                }`}
              >
                <div className="space-y-3.5">
                  {/* رأس البطاقة */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-white">{student.name}</h3>
                      <div className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">
                        {student.email}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isLocked
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {isLocked ? "مقفول أمنياً" : "نشط"}
                    </span>
                  </div>

                  {/* الهاتف والدفعة والقسم */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-850">
                      <div className="text-[10px] text-slate-500">الدفعة والقسم:</div>
                      <div className="text-blue-400 font-medium truncate mt-0.5">
                        {student.academicLevel?.name || "عام"}
                      </div>
                      {student.department && (
                        <div className="text-[10px] text-indigo-300 font-mono mt-0.5">
                          {student.department}
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-850">
                      <div className="text-[10px] text-slate-500">رقم الهاتف:</div>
                      <div className="text-white font-mono mt-0.5" dir="ltr">
                        {student.phone || "بدون رقم"}
                      </div>
                      {student.phone && (
                        <a
                          href={`https://wa.me/2${student.phone.replace(/^0/, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:underline mt-0.5"
                        >
                          <MessageCircle className="w-2.5 h-2.5" />
                          <span>مراسلة واتساب</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* الجهاز المتصل */}
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-850 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500">الجهاز المسجل:</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {student.devices?.length || 0} / {student.maxAllowedDevices} جهاز
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium text-white">
                      <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                      <span className="truncate">{student.phoneType || primaryDevice?.deviceModel || "هاتف محمول"}</span>
                    </div>
                    {primaryDevice?.ipAddress && (
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        IP: {primaryDevice.ipAddress}
                      </div>
                    )}
                  </div>

                  {/* المواد المشحونة */}
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-850 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500">المواد المفتوحة للطالب:</span>
                      <span className="text-[10px] text-emerald-400 font-bold font-mono">
                        {openSubjectsCount} مواد
                      </span>
                    </div>
                    {purchasesList.length === 0 ? (
                      <span className="text-[11px] text-slate-500">لم يتم شحن أي مواد بعد</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {purchasesList.map((p: any) => (
                          <span
                            key={p.id}
                            className="px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-800/40 text-emerald-300 text-[10px] font-medium"
                          >
                            {p.subject?.name || "مادة"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* أزرار الإجراءات السريعة في أسفل البطاقة */}
                <div className="grid grid-cols-2 gap-2 pt-4 mt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => setSelectedStudentForSubjects(student)}
                    className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>شحن/فتح المواد</span>
                  </button>

                  <button
                    onClick={() => setSelectedStudentForDevices(student)}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                    <span>إدارة الأجهزة</span>
                  </button>

                  <button
                    onClick={() => handleToggleLock(student)}
                    className={`col-span-2 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      isLocked
                        ? "bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-600/30"
                        : "bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20"
                    }`}
                  >
                    {isLocked ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>فك حظر الحساب فوراً</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>قفل الحساب أمنياً</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* عرض الجدول المدمج للبيانات الكبيرة */
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">الطالب</th>
                <th className="py-3 px-4">الدفعة والقسم</th>
                <th className="py-3 px-4">الهاتف</th>
                <th className="py-3 px-4">الأجهزة</th>
                <th className="py-3 px-4">المواد المفتوحة</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {students.map((student) => {
                const isLocked = student.status === "LOCKED";
                const openCount = student.purchases?.length || 0;

                return (
                  <tr key={student.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-white">
                      {student.name}
                      <span className="block text-[10px] text-slate-400 font-mono truncate max-w-xs">
                        {student.email}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-blue-400 font-medium">
                      {student.academicLevel?.name || "عام"}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300" dir="ltr">
                      {student.phone || "بدون رقم"}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedStudentForDevices(student)}
                        className="text-[11px] font-medium text-blue-300 hover:underline flex items-center gap-1"
                      >
                        <Smartphone className="w-3 h-3 text-blue-400" />
                        <span>{student.phoneType || "هاتف محمول"}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedStudentForSubjects(student)}
                        className="px-2.5 py-1 rounded-xl bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 hover:text-white text-[11px] font-medium flex items-center gap-1"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>{openCount} مواد مفتوحة</span>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isLocked
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {isLocked ? "مقفول" : "نشط"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-left">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedStudentForSubjects(student)}
                          className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                          title="شحن وفتح المواد"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedStudentForDevices(student)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                          title="إدارة الأجهزة"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleLock(student)}
                          className={`p-1.5 rounded-lg ${
                            isLocked
                              ? "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white"
                              : "bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white"
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
      {selectedStudentForSubjects && (
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
                <p className="text-xs text-slate-400">
                  الطالب: <span className="text-emerald-400 font-bold">{selectedStudentForSubjects.name}</span> • 
                  الدفعة: <span className="text-white">{selectedStudentForSubjects.academicLevel?.name || "عام"}</span>
                </p>
              </div>
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
              {subjects
                .filter((sub) => {
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
                  return name.includes(term) || dept.includes(term);
                })
                .map((sub) => {
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
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>{sub.name}</span>
                        {sub.department && (
                          <span className="text-[10px] text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40 font-mono">
                            {sub.department}
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
                          className="px-3.5 py-2 bg-emerald-600/20 hover:bg-red-600 text-emerald-400 hover:text-white border border-emerald-600/40 hover:border-red-600 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                          title="المادة مفعلة للطالب، انقر لإلغاء تفعيلها وقفلها"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isThisLoading ? "جاري القفل..." : "مفعلة (انقر للقفل)"}</span>
                        </button>
                      ) : (
                        <button
                          disabled={isThisLoading}
                          onClick={() => handleToggleSubject(selectedStudentForSubjects.id, sub.id, true)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center gap-1.5"
                          title="انقر لشحن وفتح المادة للطالب فوراً"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>{isThisLoading ? "جاري الشحن..." : "فتح وشحن المادة"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
      )}
    </div>
  );
}
