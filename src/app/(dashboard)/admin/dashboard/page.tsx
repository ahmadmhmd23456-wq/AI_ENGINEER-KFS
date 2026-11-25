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
  Video,
  Bot,
  Sparkles,
  KeyRound,
  Save,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // إعدادات محرك الذكاء الاصطناعي الحر للطلاب
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [showAiSetup, setShowAiSetup] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [openAiKey, setOpenAiKey] = useState("");
  const [savingAi, setSavingAi] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const fetchAiConfig = () => {
    fetch("/api/admin/ai-config")
      .then((res) => res.json())
      .then((json) => {
        if (json?.config) {
          setAiConfig(json.config);
          if (json.config.hasGeminiKey) setGeminiKey("••••••••••••");
          if (json.config.hasGroqKey) setGroqKey("••••••••••••");
          if (json.config.hasOpenRouterKey) setOpenRouterKey("••••••••••••");
          if (json.config.hasOpenAiKey) setOpenAiKey("••••••••••••");
        }
      })
      .catch(() => {});
  };

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
    fetchAiConfig();
  }, []);

  const handleSaveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAi(true);
    setAiFeedback(null);
    try {
      const res = await fetch("/api/admin/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_CONFIG",
          geminiKey,
          groqKey,
          openRouterKey,
          openAiKey,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setAiConfig(json.config);
        setAiFeedback({ type: "ok", text: json.message });
      } else {
        setAiFeedback({ type: "err", text: json.error || "فشل حفظ المفاتيح" });
      }
    } catch {
      setAiFeedback({ type: "err", text: "تعذر الاتصال بالسيرفر" });
    } finally {
      setSavingAi(false);
    }
  };

  const handleTestAi = async () => {
    setTestingAi(true);
    setAiFeedback(null);
    try {
      const res = await fetch("/api/admin/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TEST_AI" }),
      });
      const json = await res.json();
      if (res.ok) {
        setAiFeedback({
          type: "ok",
          text: `${json.message}\nرد تجريبي: "${json.reply}"`,
        });
      } else {
        setAiFeedback({
          type: "err",
          text: json.error || "لم يتم اختبار المزود بنجاح",
        });
      }
    } catch {
      setAiFeedback({ type: "err", text: "حدث خطأ أثناء الاتصال" });
    } finally {
      setTestingAi(false);
    }
  };

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
            <Video className="w-4 h-4" />
            <span>رفع وإدارة الفيديوهات والمواد</span>
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

      {/* بطاقة ربط وتفعيل محرك الذكاء الاصطناعي الحر (ChatGPT / Gemini / Groq) */}
      <div className="bg-slate-900/90 border border-cyan-500/25 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                aiConfig?.isConfigured
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
              }`}
            >
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  محرك الذكاء الاصطناعي الحر للطلاب (ChatGPT / Gemini)
                </h2>
                {aiConfig?.isConfigured ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    🟢 مفعل عبر {aiConfig.activeProvider}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    ⚡ يعمل بالوضع التفاعلي (أضف مفتاح مجاني للذكاء الكامل)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                أضف مفتاح مجاني من Google Gemini أو Groq أو OpenRouter ليحصل الطلاب على محادثات حرة كاملة بجودة ChatGPT مع حفظ المفاتيح مشفرة AES-256.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAiSetup((prev) => !prev)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <KeyRound className="w-4 h-4 text-cyan-400" />
            <span>{showAiSetup ? "إخفاء الإعدادات" : "إعداد وتفعيل الذكاء"}</span>
            {showAiSetup ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showAiSetup && (
          <div className="mt-5 pt-5 border-t border-slate-800 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form onSubmit={handleSaveAiConfig} className="lg:col-span-2 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Google Gemini API Key (الأفضل ومجاني)
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AQ... أو AIzaSy..."
                    className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Groq API Key (مجاني وسريع جداً)
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    placeholder="gsk_..."
                    className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    OpenRouter API Key (نماذج مجانية)
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    value={openRouterKey}
                    onChange={(e) => setOpenRouterKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    OpenAI API Key (اختياري - مدفوع)
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    value={openAiKey}
                    onChange={(e) => setOpenAiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {aiFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs whitespace-pre-wrap border ${
                    aiFeedback.type === "ok"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-red-500/10 border-red-500/30 text-red-300"
                  }`}
                >
                  {aiFeedback.text}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={savingAi}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingAi ? "جاري الحفظ..." : "حفظ المفاتيح وتشفيرها"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestAi}
                  disabled={testingAi}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{testingAi ? "جاري الاختبار..." : "اختبار الذكاء الآن"}</span>
                </button>
              </div>
            </form>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
              <div className="font-bold text-cyan-400">كيف تجيب مفتاح مجاني في دقيقة؟</div>
              <ol className="text-[11px] text-slate-300 space-y-2 list-decimal pr-4 leading-relaxed">
                <li>
                  افتح Google AI Studio واضغط <b>Create API Key</b> بحساب Google بتاعك.
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-cyan-400 hover:underline font-bold"
                  >
                    <span>فتح Google AI Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>أو أنشئ مفتاح مجاني سريع من Groq (Llama 3.3 70B):
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-0.5 inline-flex items-center gap-1 text-cyan-400 hover:underline font-bold"
                  >
                    <span>فتح Groq Console</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>الصق المفتاح هنا واضغط <b>حفظ</b> ثم <b>اختبار الذكاء الآن</b>.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
