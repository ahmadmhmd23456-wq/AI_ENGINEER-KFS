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
} from "lucide-react";

export default function AdminPaymentsPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  // مودال الفتح اليدوي
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
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
    fetchPayments();
  }, [status]);

  const handleManualGrant = async (e: React.FormEvent) => {
    e.preventDefault();
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
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/25 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>فتح مادة يدوياً لطالب</span>
        </button>
      </div>

      {/* شريط البحث */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 w-full md:w-48"
        >
          <option value="">جميع الحالات</option>
          <option value="COMPLETED">مكتمل ومفعل</option>
          <option value="PENDING">معلق</option>
        </select>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchPayments();
          }}
          className="relative w-full md:w-80"
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم المعاملة أو اسم الطالب..."
            className="w-full py-2 pr-9 pl-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute top-2.5 right-3" />
        </form>
      </div>

      {/* جدول المدفوعات */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">جاري تحميل المدفوعات...</div>
      ) : purchases.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
          <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">لا توجد سجلات مدفوعات مطابقة</h3>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">الطالب</th>
                <th className="py-3 px-4">المادة</th>
                <th className="py-3 px-4">طريقة الدفع</th>
                <th className="py-3 px-4">المبلغ</th>
                <th className="py-3 px-4">رقم المعاملة</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-bold text-white">
                    {p.user?.name}
                    <span className="block text-[10px] text-slate-400 font-mono" dir="ltr">
                      {p.user?.phone || p.user?.email}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-200 font-medium">
                    {p.subject?.name}
                  </td>
                  <td className="py-3 px-4 text-blue-400">{p.paymentMethod}</td>
                  <td className="py-3 px-4 font-bold font-mono text-emerald-400">
                    {p.amount} ج.م
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                    {p.transactionId || p.gatewayOrderId || "MANUAL_TX"}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === "COMPLETED"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {p.status === "COMPLETED" ? "مفعلة" : p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {new Date(p.createdAt).toLocaleDateString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* مودال الفتح اليدوي */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">فتح مادة يدوياً لطالب</h3>
            <p className="text-xs text-slate-400 mb-5">
              تفعيل اشتراك فوري لطالب قام بالدفع نقداً أو ظرف استثنائي.
            </p>

            <form onSubmit={handleManualGrant} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">اختر الطالب:</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.phone || "بدون رقم"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">اختر المادة:</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.price} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">ملاحظات التفعيل:</label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="مثال: دفع نقدي في السنتر / كود خاص"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {submitting ? "جاري التفعيل..." : "تفعيل المادة الآن"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
