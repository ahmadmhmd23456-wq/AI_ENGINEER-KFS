"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  X,
  UserCheck,
  BookOpen,
  Smartphone,
  Check,
  Sparkles,
} from "lucide-react";

export default function AdminPaymentsPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  // مودال الفتح اليدوي مع حقول البحث للطالب والمادة
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
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

  const handleManualGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedSubjectId) {
      alert("يرجى اختيار الطالب والمادة أولاً");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          subjectId: selectedSubjectId,
          adminNotes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        setAdminNotes("");
        setStudentSearchInModal("");
        setSubjectSearchInModal("");
        fetchPayments();
      } else {
        alert(data.error || "فشل الفتح اليدوي");
      }
    } catch {
      alert("حدث خطأ أثناء الاتصال");
    } finally {
      setSubmitting(false);
    }
  };

  // تطبيع الحروف العربية في البحث (همزات، تاء مربوطة، ياء)
  const normalizeArabic = (str: string) => {
    return (str || "")
      .toLowerCase()
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .trim();
  };

  // فلترة الطلاب داخل المودال
  const filteredModalStudents = students.filter((s) => {
    if (!studentSearchInModal.trim()) return true;
    const term = normalizeArabic(studentSearchInModal);
    const name = normalizeArabic(s.name);
    const phone = (s.phone || "").toLowerCase();
    const email = (s.email || "").toLowerCase();
    return name.includes(term) || phone.includes(term) || email.includes(term);
  });

  // فلترة المواد داخل المودال
  const filteredModalSubjects = subjects.filter((sub) => {
    if (!subjectSearchInModal.trim()) return true;
    const term = normalizeArabic(subjectSearchInModal);
    const name = normalizeArabic(sub.name);
    const code = (sub.code || "").toLowerCase();
    const dept = (sub.department || "").toLowerCase();
    return name.includes(term) || code.includes(term) || dept.includes(term);
  });

  const selectedStudentObj = students.find((s) => s.id === selectedUserId);
  const selectedSubjectObj = subjects.find((sub) => sub.id === selectedSubjectId);

  return (
    <div className="space-y-6" dir="rtl">
      {/* الترويسة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة المدفوعات والاشتراكات</h1>
          <p className="text-xs text-slate-400 mt-1">
            سجل فواتير الطلاب المؤكدة عبر Paymob وإمكانية الفتح اليدوي للمواد.
          </p>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
            setStudentSearchInModal("");
            setSubjectSearchInModal("");
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/25 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>فتح مادة يدوياً لطالب</span>
        </button>
      </div>

      {/* شريط الفلاتر والبحث */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* فلتر الحالة */}
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
        </div>

        {/* حقل البحث بالاسم أو الهاتف أو المعاملة */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم الهاتف أو المعاملة..."
            className="w-full py-2 pr-9 pl-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute top-2.5 right-3" />
        </div>
      </div>

      {/* جدول المعاملات */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">جاري جلب الفواتير والاشتراكات...</div>
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
                <th className="py-3 px-4">طريقة الدفع</th>
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
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                      {p.paymentMethod === "MANUAL_GRANT"
                        ? "فتح يدوي (الأدمن)"
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

      {/* مودال الفتح اليدوي مع بحث مدمج للطلاب والمواد */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">فتح مادة وشحنها يدوياً لطالب</h3>
                <p className="text-xs text-slate-400">
                  ابحث عن الطالب وعن المادة، ثم قم بتفعيل الاشتراك الفوري بنقرة واحدة.
                </p>
              </div>
            </div>

            <form onSubmit={handleManualGrant} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. قسم البحث عن الطالب واختياره */}
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

                  {/* حقل البحث عن الطالب */}
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

                  {/* قائمة نتائج الطلاب القابلة للتمرير */}
                  <div className="h-44 overflow-y-auto space-y-1.5 pr-1">
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
                            <div className="space-y-0.5 max-w-[190px]">
                              <div className="font-bold text-xs truncate">{s.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono" dir="ltr">
                                {s.phone || s.email}
                              </div>
                              {s.academicLevel?.name && (
                                <div className="text-[9px] text-blue-400 truncate">
                                  {s.academicLevel.name}
                                </div>
                              )}
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

                {/* 2. قسم البحث عن المادة واختيارها */}
                <div className="space-y-2 p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-white flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                      <span>2. ابحث عن اسم المادة:</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {filteredModalSubjects.length} مواد
                    </span>
                  </div>

                  {/* حقل البحث عن المادة */}
                  <div className="relative">
                    <input
                      type="text"
                      value={subjectSearchInModal}
                      onChange={(e) => setSubjectSearchInModal(e.target.value)}
                      placeholder="اكتب اسم المادة (فيزياء، برمجة...)..."
                      className="w-full py-2 pr-8 pl-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute top-2.5 right-2.5 pointer-events-none" />
                  </div>

                  {/* قائمة نتائج المواد القابلة للتمرير */}
                  <div className="h-44 overflow-y-auto space-y-1.5 pr-1">
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
                            <div className="space-y-0.5 max-w-[190px]">
                              <div className="font-bold text-xs truncate">{sub.name}</div>
                              <div className="text-[10px] text-emerald-400 font-mono font-bold">
                                {sub.price} ج.م • الترم {sub.term}
                              </div>
                              {sub.department && (
                                <div className="text-[9px] text-indigo-300 font-mono">
                                  {sub.department}
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
              </div>

              {/* ملخص الاختيار */}
              {(selectedStudentObj || selectedSubjectObj) && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">الطالب المحدد:</span>
                    <span className="font-bold text-blue-400">
                      {selectedStudentObj?.name || "لم يُحدد"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">المادة المحددة:</span>
                    <span className="font-bold text-emerald-400">
                      {selectedSubjectObj?.name || "لم تُحدد"}
                    </span>
                  </div>
                </div>
              )}

              {/* ملاحظات التفعيل */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  ملاحظات التفعيل (اختياري):
                </label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="مثال: دفع كاش بالسنتر / تحويل بنكي / استثناء خاص"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* أزرار الإجراء */}
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
                  disabled={submitting || !selectedUserId || !selectedSubjectId}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? "جاري تفعيل المادة..." : "تفعيل المادة للطالب فوراً"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
