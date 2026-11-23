"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  CreditCard,
  ShieldAlert,
  BookOpen,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle,
} from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = () => {
    setLoading(true);
    fetch("/api/admin/dashboard")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-400">جاري تحميل بيانات المنصة...</p>
        </div>
      </div>
    );
  }

  const { stats, topSubjects, recentPayments, recentAudits } = data || {};

  return (
    <div className="space-y-8" dir="rtl">
      {/* الترويسة وأزرار الإجراءات السريعة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">لوحة المتابعة العامة</h1>
          <p className="text-xs text-slate-400 mt-1">
            مرحباً دكتور، إليك ملخص حي لنشاط الطلاب والمبيعات والحماية الأمنية.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1.5"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">تحديث</span>
          </button>

          <button
            onClick={() => router.push("/admin/subjects")}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-blue-600/20"
          >
            <BookOpen className="w-4 h-4" />
            <span>إدارة المواد والمحتوى</span>
          </button>
        </div>
      </div>

      {/* تنبيه الحسابات المقفولة إن وجدت */}
      {stats?.lockedStudents > 0 && (
        <div className="p-4 bg-gradient-to-r from-red-950/60 via-red-900/30 to-slate-900 border border-red-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 flex-shrink-0 animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>تنبيه أمني عاجل: يوجد {stats.lockedStudents} حساب طالب مقفول حالياً!</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                تم رصد محاولات دخول بأجهزة غير مصرحة أو حسابات Google مختلفة. يرجى المراجعة لفك الحظر.
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push("/admin/locked-accounts")}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 flex-shrink-0 shadow-lg shadow-red-900/40"
          >
            <span>فحص الحسابات المحظورة</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* بطاقات الإحصائيات الأربع الرئيسية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* إجمالي الإيرادات */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">إجمالي الإيرادات</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats?.totalRevenue?.toLocaleString("ar-EG") || 0} <span className="text-sm font-normal text-emerald-400">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>مدفوعات مؤكدة عبر Paymob / المحافظ</span>
          </div>
        </div>

        {/* إجمالي الطلاب */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">إجمالي الطلاب المسجلين</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats?.totalStudents || 0} <span className="text-sm font-normal text-slate-400">طالب</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            منهم {stats?.activeStudents || 0} حساب نشط وموثق
          </div>
        </div>

        {/* الحسابات المقفولة */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">الحسابات المحظورة أمنياً</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono">
            {stats?.lockedStudents || 0} <span className="text-sm font-normal text-slate-400">حساب</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            تم إيقافهم لحماية المحتوى ومكافحة المشاركة
          </div>
        </div>

        {/* عدد المواد */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">المواد النشطة</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {topSubjects?.length || 0} <span className="text-sm font-normal text-slate-400">مواد هندسية</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            سعر المادة: 50 ج.م للطالب
          </div>
        </div>
      </div>

      {/* قسم الجداول المزدوج: المواد الأكثر مبيعاً + آخر المدفوعات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* المواد الأكثر مبيعاً */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>المواد الأكثر طلباً واشتراكاً</span>
            </h2>
            <button
              onClick={() => router.push("/admin/subjects")}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
            >
              عرض الكل
            </button>
          </div>

          <div className="space-y-3">
            {topSubjects?.map((sub: any) => (
              <div
                key={sub.id}
                className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-white">{sub.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {sub.academicLevel?.name} | ترم {sub.term === 1 ? "أول" : "ثاني"}
                  </div>
                </div>

                <div className="text-left">
                  <div className="text-xs font-bold text-emerald-400">
                    {sub._count.purchases} مشترك
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {sub._count.lessons} محاضرة | {sub._count.exams} امتحان
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* آخر المدفوعات المسجلة */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>آخر المدفوعات المؤكدة</span>
            </h2>
            <button
              onClick={() => router.push("/admin/payments")}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
            >
              سجل المدفوعات
            </button>
          </div>

          <div className="space-y-3">
            {recentPayments?.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                لا توجد مدفوعات مسجلة حتى الآن.
              </div>
            ) : (
              recentPayments?.map((pay: any) => (
                <div
                  key={pay.id}
                  className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{pay.user?.name || "طالب"}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {pay.subject?.name} • {pay.paymentMethod}
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      +{pay.amount} ج.م
                    </span>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(pay.createdAt).toLocaleDateString("ar-EG")}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* سجل المحاولات المشبوهة الحديثة (Audit Logs) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>سجل الرقابة الأمنية (آخر محاولات الدخول المشبوهة)</span>
          </h2>
          <button
            onClick={() => router.push("/admin/locked-accounts")}
            className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
          >
            إدارة الحظر
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">الطالب</th>
                <th className="py-2.5 px-3">الإجراء</th>
                <th className="py-2.5 px-3">السبب</th>
                <th className="py-2.5 px-3">عنوان IP</th>
                <th className="py-2.5 px-3">التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentAudits?.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-3 font-medium text-white">
                    {log.user?.name || "زائر غير معروف"}
                    <span className="block text-[10px] text-slate-400 font-mono">
                      {log.user?.phone || log.attemptedEmail}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.action === "ACCOUNT_LOCKED"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-300 max-w-xs truncate">{log.reason}</td>
                  <td className="py-3 px-3 font-mono text-slate-400">{log.ipAddress}</td>
                  <td className="py-3 px-3 text-slate-400">
                    {new Date(log.createdAt).toLocaleString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
