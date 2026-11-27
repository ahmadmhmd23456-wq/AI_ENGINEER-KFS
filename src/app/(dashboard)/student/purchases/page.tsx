"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, CheckCircle2, Clock, AlertCircle, RefreshCw } from "lucide-react";

export default function StudentPurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/purchases")
      .then((res) => res.json())
      .then((data) => {
        setPurchases(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-white">سجل المدفوعات والاشتراكات</h1>
        <p className="text-xs text-slate-400 mt-1">
          قائمة بجميع المواد التي قمت بشرائها مع أرقام المعاملات وتاريخ الدفع.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : purchases.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
          <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">لا توجد مدفوعات سابقة</h3>
          <p className="text-xs text-slate-400">اشترك في مواد دفعتك لتظهر فواتيرك هنا.</p>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
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
                    {p.subject?.name}
                    <span className="block text-[10px] text-slate-400 font-mono">
                      ترم {p.subject?.term === 1 ? "أول" : "ثاني"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-medium">
                    {p.paymentMethod === "BUNDLE_GRANT"
                      ? "عرض كل المواد (1200 ج.م)"
                      : p.paymentMethod === "MANUAL_GRANT"
                      ? "فتح مادة واحدة (الأدمن)"
                      : p.paymentMethod}
                  </td>
                  <td className="py-3 px-4 font-bold font-mono text-emerald-400">
                    {p.amount} {p.currency}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
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
                      {p.status === "COMPLETED" ? "مكتملة ومفعلة" : p.status}
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
    </div>
  );
}
