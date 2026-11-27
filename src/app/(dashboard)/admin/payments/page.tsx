"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  Search,
  CheckCircle2,
  X,
  UserCheck,
  BookOpen,
  Check,
  Sparkles,
  Layers,
  Users,
} from "lucide-react";

const DEPT_LABELS: Record<string, string> = {
  GENERAL: "عامة / إعدادي",
  AI: "ذكاء اصطناعي",
  MECHATRONICS: "ميكاترونكس",
  ARCHITECTURE: "عمارة",
  CIVIL: "مدني / إنشائي",
};

export default function AdminPaymentsPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [activeViewTab, setActiveViewTab] = useState<
    "TRANSACTIONS" | "BUNDLE_SUBSCRIBERS" | "SINGLE_SUBSCRIBERS"
  >("TRANSACTIONS");
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  // وضع التفعيل: مادة واحدة (300 ج.م) أو عرض كل المواد (1200 ج.م)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [grantMode, setGrantMode] = useState<"SINGLE" | "BUNDLE">("SINGLE");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [bundleTerm, setBundleTerm] = useState<"1" | "2" | "ALL">("1");
  const [selectedBundleSubjectIds, setSelectedBundleSubjectIds] = useState<string[]>([]);
  const [studentSearchInModal, setStudentSearchInModal] = useState("");
  const [subjectSearchInModal, setSubjectSearchInModal] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPayments = () => {
    setLoading(true);
    let url = "/api/admin/payments";
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status) params.append("status", status);
    if (params.toString()) url += `?${params.toString()}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setPurchases(data.purchases || []);
        setStudents(data.students || []);
        setSubjects(data.subjects || []);
        setAnalytics(data.analytics || null);
        if (data.students?.length > 0 && !selectedUserId) setSelectedUserId(data.students[0].id);
        if (data.subjects?.length > 0 && !selectedSubjectId) setSelectedSubjectId(data.subjects[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, status]);

  const normalizeArabic = (str: string) => {
    return (str || "")
      .toLowerCase()
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .trim();
  };

  const selectedStudentObj = students.find((s) => s.id === selectedUserId);
  const selectedSubjectObj = subjects.find((sub) => sub.id === selectedSubjectId);

  // حساب المواد المطابقة للطالب في العرض حسب فرقته وقسمه والترم المختار
  const matchingStudentBundleSubjects = useMemo(() => {
    if (!selectedStudentObj) return subjects;
    const lvlId = selectedStudentObj.academicLevelId;
    const isPrep = selectedStudentObj.academicLevel?.slug === "prep";
    const dept = isPrep ? "GENERAL" : selectedStudentObj.department;

    return subjects.filter((sub) => {
      if (lvlId && sub.academicLevelId !== lvlId) return false;
      if (bundleTerm !== "ALL" && String(sub.term) !== bundleTerm) return false;
      if (dept) {
        return sub.department === dept || sub.department === "GENERAL" || !sub.department;
      }
      return true;
    });
  }, [selectedStudentObj, subjects, bundleTerm]);

  useEffect(() => {
    setSelectedBundleSubjectIds(matchingStudentBundleSubjects.map((s) => s.id));
  }, [matchingStudentBundleSubjects]);

  const openGrantModal = (mode: "SINGLE" | "BUNDLE") => {
    setGrantMode(mode);
    setIsModalOpen(true);
    setStudentSearchInModal("");
    setSubjectSearchInModal("");
    setAdminNotes("");
  };

  const toggleBundleSubject = (id: string) => {
    setSelectedBundleSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleManualGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      alert("يرجى اختيار الطالب أولاً");
      return;
    }

    if (grantMode === "SINGLE" && !selectedSubjectId) {
      alert("يرجى اختيار المادة أولاً");
      return;
    }

    if (grantMode === "BUNDLE" && selectedBundleSubjectIds.length === 0) {
      alert("يرجى تحديد مادة واحدة على الأقل ضمن العرض");
      return;
    }

    setSubmitting(true);
    try {
      const payload =
        grantMode === "BUNDLE"
          ? {
              action: "BUNDLE_GRANT",
              userId: selectedUserId,
              term: bundleTerm,
              subjectIds: selectedBundleSubjectIds,
              adminNotes,
            }
          : {
              action: "SINGLE_GRANT",
              userId: selectedUserId,
              subjectId: selectedSubjectId,
              adminNotes,
            };

      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        setAdminNotes("");
        setStudentSearchInModal("");
        setSubjectSearchInModal("");
        fetchPayments();
      } else {
        alert(data.error || "فشل تنفيذ التفعيل");
      }
    } catch {
      alert("حدث خطأ أثناء الاتصال");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredModalStudents = students.filter((s) => {
    if (!studentSearchInModal.trim()) return true;
    const term = normalizeArabic(studentSearchInModal);
    const name = normalizeArabic(s.name);
    const phone = (s.phone || "").toLowerCase();
    const email = (s.email || "").toLowerCase();
    return name.includes(term) || phone.includes(term) || email.includes(term);
  });

  const filteredModalSubjects = subjects.filter((sub) => {
    if (!subjectSearchInModal.trim()) return true;
    const term = normalizeArabic(subjectSearchInModal);
    const name = normalizeArabic(sub.name);
    const code = (sub.code || "").toLowerCase();
    const dept = (sub.department || "").toLowerCase();
    return name.includes(term) || code.includes(term) || dept.includes(term);
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* الترويسة */}
      <div>
        <h1 className="text-2xl font-bold text-white">إدارة المدفوعات والاشتراكات</h1>
        <p className="text-xs text-slate-400 mt-1">
          سجل فواتير الطلاب مع خيارين منفصلين للتفعيل اليدوي: مادة واحدة (300 ج.م) أو عرض كل المواد (1200 ج.م).
        </p>
      </div>

      {/* مكانين منفصلين للتفعيل عند الأدمن: مادة واحدة vs عرض كل المواد */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* المكان 1: تفعيل مادة واحدة */}
        <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/35 rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">1. تفعيل مادة واحدة لطالب</h2>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  لو الطالب حوّل رسوم مادة واحدة فقط وعايز تفتحهاله لوحدها فوراً.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold whitespace-nowrap">
              300 ج.م
            </span>
          </div>

          <button
            type="button"
            onClick={() => openGrantModal("SINGLE")}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30"
          >
            <BookOpen className="w-4 h-4" />
            <span>فتح وتفعيل مادة واحدة (300 ج.م)</span>
          </button>
        </div>

        {/* المكان 2: تفعيل عرض كل المواد */}
        <div className="bg-gradient-to-br from-amber-950/50 via-indigo-950/40 to-slate-900 border border-amber-500/40 rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/35 text-amber-300 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">2. تفعيل عرض كل المواد للطالب</h2>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  لو الطالب اشترك في العرض الشامل، ففعّل كل مواد قسمه وفرقته بنقرة واحدة.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold whitespace-nowrap">
              1200 ج.م
            </span>
          </div>

          <button
            type="button"
            onClick={() => openGrantModal("BUNDLE")}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-900/30"
          >
            <Layers className="w-4 h-4" />
            <span>تفعيل عرض كل المواد (1200 ج.م)</span>
          </button>
        </div>
      </div>

      {/* إحصائيات سريعة: كام واحد مشترك في العرض vs كام واحد مفعل مواد بدون عرض */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setActiveViewTab("BUNDLE_SUBSCRIBERS")}
            className={`text-right p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              activeViewTab === "BUNDLE_SUBSCRIBERS"
                ? "bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-900/20"
                : "bg-slate-900/80 border-slate-800 hover:border-amber-500/40"
            }`}
          >
            <div className="space-y-1">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>مشتركي العرض (1200 ج.م)</span>
              </div>
              <div className="text-2xl font-extrabold font-mono text-white">
                {analytics?.bundleSubscribersCount ?? 0}{" "}
                <span className="text-xs font-normal text-slate-400">طالب</span>
              </div>
              <div className="text-[11px] text-slate-400">
                إجمالي الإيراد:{" "}
                <span className="font-mono font-bold text-amber-300">
                  {analytics?.bundleRevenue ?? 0} ج.م
                </span>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
              عرض التفاصيل
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab("SINGLE_SUBSCRIBERS")}
            className={`text-right p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              activeViewTab === "SINGLE_SUBSCRIBERS"
                ? "bg-blue-600/20 border-blue-400 shadow-lg shadow-blue-900/20"
                : "bg-slate-900/80 border-slate-800 hover:border-blue-500/40"
            }`}
          >
            <div className="space-y-1">
              <div className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>مفعلين مواد بدون عرض</span>
              </div>
              <div className="text-2xl font-extrabold font-mono text-white">
                {analytics?.singleSubscribersCount ?? 0}{" "}
                <span className="text-xs font-normal text-slate-400">طالب</span>
              </div>
              <div className="text-[11px] text-slate-400">
                إجمالي المواد المفعلة فردياً:{" "}
                <span className="font-mono font-bold text-emerald-400">
                  {analytics?.totalSingleSubjectsCount ?? 0} مادة
                </span>
                {" • "}
                <span className="font-mono text-slate-300">{analytics?.singleRevenue ?? 0} ج.م</span>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-bold">
              عرض الطلاب والمواد
            </span>
          </button>
        </div>

        {analytics?.subjectSingleCounts?.length > 0 && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5 space-y-2">
            <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>تفصيل المواد المفعلة خارج العرض ({analytics.subjectSingleCounts.length} مواد):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {analytics.subjectSingleCounts.map((item: any) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-200"
                >
                  <span className="font-bold">{item.name}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-mono text-[10px] font-bold">
                    {item.count} طالب
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* تبويبات العرض + شريط الفلاتر والبحث */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveViewTab("TRANSACTIONS")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeViewTab === "TRANSACTIONS"
                ? "bg-blue-600 text-white shadow"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            سجل المعاملات ({purchases.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab("BUNDLE_SUBSCRIBERS")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeViewTab === "BUNDLE_SUBSCRIBERS"
                ? "bg-amber-500 text-slate-950 shadow"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            مشتركي العرض ({analytics?.bundleSubscribersCount ?? 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab("SINGLE_SUBSCRIBERS")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeViewTab === "SINGLE_SUBSCRIBERS"
                ? "bg-emerald-600 text-white shadow"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            مفعلين مواد بدون عرض ({analytics?.singleSubscribersCount ?? 0})
          </button>

          {activeViewTab === "TRANSACTIONS" && (
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">جميع الحالات</option>
              <option value="COMPLETED">مكتمل (ناجح)</option>
              <option value="PENDING">معلق</option>
              <option value="FAILED">فشل</option>
              <option value="REFUNDED">مسترجع</option>
            </select>
          )}
        </div>

        <div className="relative w-full lg:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم الهاتف أو المادة..."
            className="w-full py-2 pr-9 pl-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute top-2.5 right-3" />
        </div>
      </div>

      {/* عرض المحتوى حسب التبويب المختار */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">جاري جلب الفواتير والاشتراكات...</div>
      ) : activeViewTab === "BUNDLE_SUBSCRIBERS" ? (
        (() => {
          const list = (analytics?.bundleSubscribers || []).filter((item: any) => {
            if (!search.trim()) return true;
            const term = normalizeArabic(search);
            return (
              normalizeArabic(item.user?.name).includes(term) ||
              (item.user?.phone || "").toLowerCase().includes(term) ||
              (item.subjects || []).some((s: any) => normalizeArabic(s.name).includes(term))
            );
          });

          if (list.length === 0) {
            return (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
                <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">لا يوجد طلاب مشتركين في العرض حالياً</h3>
                <p className="text-xs text-slate-400">
                  يمكنك تفعيل عرض كل المواد (1200 ج.م) لأي طالب من الزر البرتقالي بالأعلى.
                </p>
              </div>
            );
          }

          return (
            <div className="space-y-3">
              {list.map((item: any) => (
                <div
                  key={item.user.id}
                  className="bg-slate-900/85 border border-amber-500/30 rounded-2xl p-4 space-y-3 shadow-lg"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-white">{item.user.name}</div>
                      <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                        <span dir="ltr" className="font-mono">{item.user.phone || item.user.email}</span>
                        <span>•</span>
                        <span className="text-blue-300">{item.user.academicLevelName || "غير محدد"}</span>
                        {item.user.department && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-300">
                              {DEPT_LABELS[item.user.department] || item.user.department}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-mono font-bold">
                        {item.totalPaid} ج.م ({item.subjects.length} مواد بالعرض)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(item.latestAt).toLocaleDateString("ar-EG")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
                    {item.subjects.map((sub: any) => (
                      <span
                        key={sub.id}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-emerald-300 font-medium"
                      >
                        ✓ {sub.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()
      ) : activeViewTab === "SINGLE_SUBSCRIBERS" ? (
        (() => {
          const list = (analytics?.singleSubscribers || []).filter((item: any) => {
            if (!search.trim()) return true;
            const term = normalizeArabic(search);
            return (
              normalizeArabic(item.user?.name).includes(term) ||
              (item.user?.phone || "").toLowerCase().includes(term) ||
              (item.subjects || []).some((s: any) => normalizeArabic(s.name).includes(term))
            );
          });

          if (list.length === 0) {
            return (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
                <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">لا يوجد طلاب مفعلين لمواد فردية بدون عرض</h3>
              </div>
            );
          }

          return (
            <div className="space-y-3">
              {list.map((item: any) => (
                <div
                  key={item.user.id}
                  className="bg-slate-900/85 border border-blue-500/30 rounded-2xl p-4 space-y-3 shadow-lg"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-white">{item.user.name}</div>
                      <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                        <span dir="ltr" className="font-mono">{item.user.phone || item.user.email}</span>
                        <span>•</span>
                        <span className="text-blue-300">{item.user.academicLevelName || "غير محدد"}</span>
                        {item.user.department && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-300">
                              {DEPT_LABELS[item.user.department] || item.user.department}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold">
                        {item.subjects.length} مادة ({item.totalPaid} ج.م)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(item.latestAt).toLocaleDateString("ar-EG")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400 ml-1">المواد المفعلة:</span>
                    {item.subjects.map((sub: any) => (
                      <span
                        key={sub.id}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-blue-300 font-medium flex items-center gap-1"
                      >
                        <span>📘 {sub.name}</span>
                        <span className="text-[10px] font-mono text-emerald-400">({sub.amount} ج.م)</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()
      ) : purchases.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
          <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">لا توجد عمليات دفع أو اشتراكات مسجلة</h3>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">رقم المعاملة</th>
                <th className="py-3 px-4">الطالب</th>
                <th className="py-3 px-4">المادة</th>
                <th className="py-3 px-4">المبلغ</th>
                <th className="py-3 px-4">نوع التفعيل / الدفع</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                    {p.transactionId || p.gatewayOrderId || p.id.slice(0, 10)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-white">{p.user?.name || "طالب غير معروف"}</div>
                    <div className="text-[10px] text-slate-400 font-mono" dir="ltr">
                      {p.user?.phone || p.user?.email || "-"}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium text-blue-400">
                    {p.subject?.name || "مادة غير معروفة"}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-white">
                    {p.amount} {p.currency}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg border ${
                        p.paymentMethod === "BUNDLE_GRANT"
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : "bg-slate-950 text-slate-300 border-slate-800"
                      }`}
                    >
                      {p.paymentMethod === "BUNDLE_GRANT"
                        ? "عرض كل المواد (1200 ج.م)"
                        : p.paymentMethod === "MANUAL_GRANT"
                        ? "فتح مادة واحدة (الأدمن)"
                        : p.paymentMethod === "WALLET"
                        ? "محفظة كاش"
                        : p.paymentMethod === "INSTAPAY"
                        ? "انستاباي"
                        : p.paymentMethod === "CARD"
                        ? "بطاقة بنكية"
                        : p.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === "COMPLETED"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : p.status === "PENDING"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {p.status === "COMPLETED"
                        ? "ناجح ومفعل"
                        : p.status === "PENDING"
                        ? "قيد الانتظار"
                        : p.status === "REFUNDED"
                        ? "مسترجع"
                        : "فشل"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {new Date(p.createdAt).toLocaleDateString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* مودال التفعيل اليدوي: يدعم وضع المادة الواحدة ووضع عرض كل المواد */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  grantMode === "BUNDLE"
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-emerald-600/20 text-emerald-400"
                }`}
              >
                {grantMode === "BUNDLE" ? <Sparkles className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {grantMode === "BUNDLE"
                    ? "تفعيل عرض كل المواد للطالب (1200 ج.م)"
                    : "فتح وتفعيل مادة واحدة للطالب (300 ج.م)"}
                </h3>
                <p className="text-xs text-slate-400">
                  {grantMode === "BUNDLE"
                    ? "اختر الطالب وسيتم تحديد كل مواد فرقته وقسمه تلقائياً لتفعيلها ضمن العرض."
                    : "ابحث عن الطالب وعن المادة الواحدة، ثم فعّل الاشتراك فوراً."}
                </p>
              </div>
            </div>

            {/* تبويب التبديل بين المكانين */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950 border border-slate-800 rounded-2xl mb-4 text-xs">
              <button
                type="button"
                onClick={() => setGrantMode("SINGLE")}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                  grantMode === "SINGLE"
                    ? "bg-emerald-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>مادة واحدة (300 ج.م)</span>
              </button>
              <button
                type="button"
                onClick={() => setGrantMode("BUNDLE")}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                  grantMode === "BUNDLE"
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>عرض كل المواد (1200 ج.م)</span>
              </button>
            </div>

            <form onSubmit={handleManualGrant} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. اختيار الطالب */}
                <div className="space-y-2 p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-white flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                      <span>1. ابحث عن اسم الطالب:</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {filteredModalStudents.length} نتائج
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={studentSearchInModal}
                      onChange={(e) => setStudentSearchInModal(e.target.value)}
                      placeholder="اكتب اسم الطالب، رقم الهاتف، أو الجيميل..."
                      className="w-full py-2 pr-8 pl-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute top-2.5 right-2.5 pointer-events-none" />
                  </div>

                  <div className="h-48 overflow-y-auto space-y-1.5 pr-1">
                    {filteredModalStudents.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-[11px]">
                        لم يتم العثور على طالب يطابق البحث
                      </div>
                    ) : (
                      filteredModalStudents.map((s) => {
                        const isSelected = selectedUserId === s.id;
                        return (
                          <div
                            key={s.id}
                            onClick={() => setSelectedUserId(s.id)}
                            className={`p-2.5 rounded-xl cursor-pointer transition-all border flex items-center justify-between ${
                              isSelected
                                ? "bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-600/10"
                                : "bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60"
                            }`}
                          >
                            <div className="space-y-0.5 max-w-[200px]">
                              <div className="font-bold text-xs truncate">{s.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono" dir="ltr">
                                {s.phone || s.email}
                              </div>
                              <div className="text-[9px] text-blue-400 truncate">
                                {s.academicLevel?.name || "غير محدد"}
                                {s.department ? ` • ${DEPT_LABELS[s.department] || s.department}` : ""}
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 2. إما مادة واحدة أو قائمة مواد العرض */}
                {grantMode === "SINGLE" ? (
                  <div className="space-y-2 p-3 bg-slate-950 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-white flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                        <span>2. اختر المادة الواحدة:</span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {filteredModalSubjects.length} مواد
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={subjectSearchInModal}
                        onChange={(e) => setSubjectSearchInModal(e.target.value)}
                        placeholder="اكتب اسم المادة..."
                        className="w-full py-2 pr-8 pl-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute top-2.5 right-2.5 pointer-events-none" />
                    </div>

                    <div className="h-48 overflow-y-auto space-y-1.5 pr-1">
                      {filteredModalSubjects.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-[11px]">
                          لم يتم العثور على مادة تطابق البحث
                        </div>
                      ) : (
                        filteredModalSubjects.map((sub) => {
                          const isSelected = selectedSubjectId === sub.id;
                          return (
                            <div
                              key={sub.id}
                              onClick={() => setSelectedSubjectId(sub.id)}
                              className={`p-2.5 rounded-xl cursor-pointer transition-all border flex items-center justify-between ${
                                isSelected
                                  ? "bg-emerald-600/20 border-emerald-500 text-white shadow-md shadow-emerald-600/10"
                                  : "bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60"
                              }`}
                            >
                              <div className="space-y-0.5 max-w-[200px]">
                                <div className="font-bold text-xs truncate">{sub.name}</div>
                                <div className="text-[10px] text-emerald-400 font-mono font-bold">
                                  {sub.price} ج.م • الترم {sub.term}
                                </div>
                                {sub.department && (
                                  <div className="text-[9px] text-indigo-300 font-mono">
                                    {DEPT_LABELS[sub.department] || sub.department}
                                  </div>
                                )}
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 p-3 bg-slate-950 rounded-2xl border border-amber-500/30">
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        <span>2. مواد العرض ({selectedBundleSubjectIds.length} مادة):</span>
                      </label>
                      <select
                        value={bundleTerm}
                        onChange={(e) => setBundleTerm(e.target.value as "1" | "2" | "ALL")}
                        className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-white"
                      >
                        <option value="1">الترم الأول</option>
                        <option value="2">الترم الثاني</option>
                        <option value="ALL">الترمين معاً</option>
                      </select>
                    </div>

                    <div className="h-48 overflow-y-auto space-y-1.5 pr-1">
                      {matchingStudentBundleSubjects.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-[11px]">
                          لا توجد مواد مسجلة في فرقة/قسم هذا الطالب للترم المحدد
                        </div>
                      ) : (
                        matchingStudentBundleSubjects.map((sub) => {
                          const checked = selectedBundleSubjectIds.includes(sub.id);
                          return (
                            <label
                              key={sub.id}
                              className={`p-2 rounded-xl cursor-pointer transition-all border flex items-center justify-between gap-2 ${
                                checked
                                  ? "bg-amber-500/15 border-amber-500/50 text-white"
                                  : "bg-slate-900/60 border-slate-800/80 text-slate-400"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleBundleSubject(sub.id)}
                                  className="accent-amber-500"
                                />
                                <span className="font-bold text-[11px] truncate">{sub.name}</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
                                {sub.code || `T${sub.term}`}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>

                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-[11px]">
                      <span className="text-amber-200 font-medium">سعر باقة العرض كاملة:</span>
                      <span className="font-mono font-extrabold text-amber-300 text-sm">1200 ج.م</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ملخص الاختيار */}
              {selectedStudentObj && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">الطالب المحدد:</span>
                    <span className="font-bold text-blue-400">{selectedStudentObj.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">نوع التفعيل:</span>
                    {grantMode === "BUNDLE" ? (
                      <span className="font-bold text-amber-300">
                        عرض كل المواد ({selectedBundleSubjectIds.length} مادة — 1200 ج.م)
                      </span>
                    ) : (
                      <span className="font-bold text-emerald-400">
                        {selectedSubjectObj?.name || "لم تُحدد"} ({selectedSubjectObj?.price || 300} ج.م)
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  ملاحظات التفعيل (اختياري):
                </label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="مثال: تحويل فودافون كاش / انستاباي / دفع بالسنتر"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !selectedUserId ||
                    (grantMode === "SINGLE" ? !selectedSubjectId : selectedBundleSubjectIds.length === 0)
                  }
                  className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg disabled:opacity-50 ${
                    grantMode === "BUNDLE"
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {submitting
                      ? "جاري التفعيل..."
                      : grantMode === "BUNDLE"
                      ? `تفعيل عرض كل المواد (${selectedBundleSubjectIds.length} مادة · 1200 ج.م)`
                      : `تفعيل المادة الواحدة (${selectedSubjectObj?.price || 300} ج.م)`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
