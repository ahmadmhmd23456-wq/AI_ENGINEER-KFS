"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Users,
  BookOpen,
  GraduationCap,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Phone,
  Settings,
  Save,
  QrCode,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function AdminBroadcastPage() {
  const [levels, setLevels] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  // إعدادات ربط رقم الواتساب الخاص بالمنصة
  const [waConfig, setWaConfig] = useState<any>(null);
  const [showWaSetup, setShowWaSetup] = useState(false);
  const [waProvider, setWaProvider] = useState<"ULTRAMSG" | "META" | "CUSTOM">("ULTRAMSG");
  const [senderPhone, setSenderPhone] = useState("");
  const [ultramsgInstanceId, setUltramsgInstanceId] = useState("");
  const [ultramsgToken, setUltramsgToken] = useState("");
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [customApiUrl, setCustomApiUrl] = useState("");
  const [customApiToken, setCustomApiToken] = useState("");
  const [savingWa, setSavingWa] = useState(false);
  const [testPhone, setTestPhone] = useState("01065375309");
  const [testingWa, setTestingWa] = useState(false);
  const [waFeedback, setWaFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [targetType, setTargetType] = useState<"ALL_STUDENTS" | "ACADEMIC_LEVEL" | "SUBJECT_ENROLLED">("ALL_STUDENTS");
  const [targetId, setTargetId] = useState("");
  const [messageText, setMessageText] = useState(
    "أهلاً يا بشمهندس {name} 👋\nنود إعلامك بأنه تم رفع محتوى جديد وشيت المحاضرة على المنصة. بالتوفيق!"
  );

  const [sending, setSending] = useState(false);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  const fetchWaConfig = () => {
    fetch("/api/admin/whatsapp")
      .then((res) => res.json())
      .then((data) => {
        if (data?.config) {
          setWaConfig(data.config);
          if (data.config.provider && data.config.provider !== "NONE") {
            setWaProvider(data.config.provider);
          }
          setSenderPhone(data.config.senderPhone || "");
          setUltramsgInstanceId(data.config.ultramsgInstanceId || "");
          if (data.config.hasUltramsgToken) setUltramsgToken("••••••••••••");
          setMetaPhoneNumberId(data.config.metaPhoneNumberId || "");
          if (data.config.hasMetaToken) setMetaAccessToken("••••••••••••");
          setCustomApiUrl(data.config.customApiUrl || "");
          if (data.config.hasCustomToken) setCustomApiToken("••••••••••••");
          if (!data.config.isConnected) setShowWaSetup(true);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchWaConfig();
    fetch("/api/admin/subjects")
      .then((res) => res.json())
      .then((data) => {
        setLevels(data.levels || []);
        setSubjects(data.subjects || []);
        if (data.levels?.length > 0) setTargetId(data.levels[0].id);
      })
      .catch(() => {});
  }, []);

  const handleSaveWaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWa(true);
    setWaFeedback(null);
    try {
      const res = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_CONFIG",
          provider: waProvider,
          senderPhone,
          ultramsgInstanceId,
          ultramsgToken,
          metaPhoneNumberId,
          metaAccessToken,
          customApiUrl,
          customApiToken,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setWaConfig(data.config);
        setWaFeedback({ type: "ok", text: data.message });
      } else {
        setWaFeedback({ type: "err", text: data.error || "فشل حفظ الإعدادات" });
      }
    } catch {
      setWaFeedback({ type: "err", text: "خطأ في الاتصال بالخادم" });
    } finally {
      setSavingWa(false);
    }
  };

  const handleTestWaSend = async () => {
    if (!testPhone.trim()) return;
    setTestingWa(true);
    setWaFeedback(null);
    try {
      const res = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TEST_SEND", testPhone }),
      });
      const data = await res.json();
      if (res.ok) {
        setWaFeedback({ type: "ok", text: data.message });
      } else {
        setWaFeedback({ type: "err", text: data.error || "فشل الاختبار" });
      }
    } catch {
      setWaFeedback({ type: "err", text: "خطأ في الاتصال" });
    } finally {
      setTestingWa(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessInfo(null);
    setErrorInfo(null);

    if (!messageText.trim()) {
      setErrorInfo("برجاء كتابة نص الرسالة");
      return;
    }

    if (!confirm("هل أنت متأكد من بدء إرسال الرسالة لجميع الطلاب المستهدفين عبر الواتساب؟")) {
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId: targetType === "ALL_STUDENTS" ? undefined : targetId,
          messageText,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessInfo(data.message);
      } else {
        setErrorInfo(data.error || "فشل إرسال الرسائل الجماعية");
      }
    } catch {
      setErrorInfo("حدث خطأ في الاتصال بالخادم");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-white">إرسال رسائل جماعية (WhatsApp Broadcast)</h1>
        <p className="text-xs text-slate-400 mt-1">
          ربط رقم الواتساب الخاص بالمنصة وإرسال تنبيهات مباشرة للطلاب أو دفعة محددة.
        </p>
      </div>

      {/* بطاقة ربط وإعداد رقم واتساب المنصة */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">ربط رقم واتساب المنصة للإرسال التلقائي</h2>
                {waConfig?.isConnected ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                    🟢 متصل ({waConfig.provider}) {waConfig.senderPhone ? `• ${waConfig.senderPhone}` : ""}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                    ⚠️ غير متصل بعد (يلزم إدخال بيانات الربط)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                اربط رقم المنصة مرة واحدة لإرسال التذكيرات ونتائج الامتحانات والرسائل الجماعية تلقائياً لأرقام الطلاب.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowWaSetup((p) => !p)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{showWaSetup ? "إخفاء الإعدادات" : "إعدادات الربط والاختبار"}</span>
            {showWaSetup ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {waFeedback && (
          <div
            className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
              waFeedback.type === "ok"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}
          >
            {waFeedback.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{waFeedback.text}</span>
          </div>
        )}

        {showWaSetup && (
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 lg:grid-cols-3 gap-5">
            <form onSubmit={handleSaveWaConfig} className="lg:col-span-2 space-y-4 text-xs">
              {/* اختيار طريقة الربط */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setWaProvider("ULTRAMSG")}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    waProvider === "ULTRAMSG"
                      ? "bg-emerald-600/20 border-emerald-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ربط بـ QR Code (UltraMsg)</span>
                  </div>
                  <div className="text-[10px] opacity-80 mt-0.5">الأسهل — مسح QR من واتساب الموبايل</div>
                </button>

                <button
                  type="button"
                  onClick={() => setWaProvider("META")}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    waProvider === "META"
                      ? "bg-blue-600/20 border-blue-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Meta Cloud API (الرسمي)</span>
                  </div>
                  <div className="text-[10px] opacity-80 mt-0.5">مجاني من ميتا لرقم جديد مخصص</div>
                </button>

                <button
                  type="button"
                  onClick={() => setWaProvider("CUSTOM")}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    waProvider === "CUSTOM"
                      ? "bg-purple-600/20 border-purple-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="font-bold">بوابة API مخصصة</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Evolution / WaSender / Webhook</div>
                </button>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">رقم واتساب المنصة (للعرض والتعريف):</label>
                <input
                  type="text"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="مثال: 010xxxxxxxx"
                  dir="ltr"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {waProvider === "ULTRAMSG" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">UltraMsg Instance ID:</label>
                    <input
                      type="text"
                      value={ultramsgInstanceId}
                      onChange={(e) => setUltramsgInstanceId(e.target.value)}
                      placeholder="instance12345"
                      dir="ltr"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">UltraMsg Token:</label>
                    <input
                      type="password"
                      value={ultramsgToken}
                      onChange={(e) => setUltramsgToken(e.target.value)}
                      placeholder="أدخل التوكن"
                      dir="ltr"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white"
                    />
                  </div>
                </div>
              )}

              {waProvider === "META" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Phone Number ID:</label>
                    <input
                      type="text"
                      value={metaPhoneNumberId}
                      onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                      placeholder="e.g. 482910482910"
                      dir="ltr"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Permanent Access Token:</label>
                    <input
                      type="password"
                      value={metaAccessToken}
                      onChange={(e) => setMetaAccessToken(e.target.value)}
                      placeholder="EAAG..."
                      dir="ltr"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white"
                    />
                  </div>
                </div>
              )}

              {waProvider === "CUSTOM" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Endpoint URL:</label>
                    <input
                      type="url"
                      value={customApiUrl}
                      onChange={(e) => setCustomApiUrl(e.target.value)}
                      placeholder="https://..."
                      dir="ltr"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Bearer Token (اختياري):</label>
                    <input
                      type="password"
                      value={customApiToken}
                      onChange={(e) => setCustomApiToken(e.target.value)}
                      dir="ltr"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={savingWa}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingWa ? "جاري الحفظ..." : "حفظ إعدادات الربط"}</span>
                </button>
              </div>
            </form>

            {/* اختبار الإرسال + خطوات الربط السريعة */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
              <div className="font-bold text-white">اختبار إرسال رسالة حقيقية الآن:</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="010..."
                  dir="ltr"
                  className="flex-1 p-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-white text-xs"
                />
                <button
                  type="button"
                  onClick={handleTestWaSend}
                  disabled={testingWa}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold whitespace-nowrap"
                >
                  {testingWa ? "جاري..." : "اختبار"}
                </button>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-1.5 text-[11px] text-slate-400 leading-relaxed">
                <div className="font-bold text-emerald-400">خطوات الربط السريعة:</div>
                {waProvider === "ULTRAMSG" ? (
                  <>
                    <div>1. افتح حساب على UltraMsg (أو أي بوابة QR).</div>
                    <div>2. امسح الـ QR Code من تطبيق واتساب لرقم المنصة المخصص.</div>
                    <div>3. انسخ Instance ID و Token واضغط &quot;حفظ&quot; ثم &quot;اختبار&quot;.</div>
                  </>
                ) : (
                  <>
                    <div>1. أنشئ تطبيق Business على developers.facebook.com.</div>
                    <div>2. أضف منتج WhatsApp وسجّل رقم المنصة (غير مربوط بتطبيق عادي).</div>
                    <div>3. انسخ Phone Number ID و Permanent Token واحفظهما هنا.</div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {successInfo && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successInfo}</span>
        </div>
      )}

      {errorInfo && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorInfo}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* فورم الإرسال */}
        <form onSubmit={handleSend} className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
          {/* اختيار الجمهور المستهدف */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">الجمهور المستهدف:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTargetType("ALL_STUDENTS")}
                className={`p-3 rounded-xl border text-center transition-all ${
                  targetType === "ALL_STUDENTS"
                    ? "bg-blue-600 text-white font-bold border-blue-500 shadow-md shadow-blue-600/20"
                    : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                جميع الطلاب المسجلين
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetType("ACADEMIC_LEVEL");
                  if (levels.length > 0) setTargetId(levels[0].id);
                }}
                className={`p-3 rounded-xl border text-center transition-all ${
                  targetType === "ACADEMIC_LEVEL"
                    ? "bg-blue-600 text-white font-bold border-blue-500 shadow-md shadow-blue-600/20"
                    : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                دفعة دراسية معينة
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetType("SUBJECT_ENROLLED");
                  if (subjects.length > 0) setTargetId(subjects[0].id);
                }}
                className={`p-3 rounded-xl border text-center transition-all ${
                  targetType === "SUBJECT_ENROLLED"
                    ? "bg-blue-600 text-white font-bold border-blue-500 shadow-md shadow-blue-600/20"
                    : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                المشتركون في مادة معينة
              </button>
            </div>
          </div>

          {/* محدد الدفعة أو المادة إذا اختيرت */}
          {targetType === "ACADEMIC_LEVEL" && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">اختر الدفعة:</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetType === "SUBJECT_ENROLLED" && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">اختر المادة:</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.academicLevel?.name})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* نص الرسالة */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300">نص الرسالة (WhatsApp):</label>
              <span className="text-[10px] text-blue-400 font-mono">استخدم {"{name}"} لاسم الطالب تلقائياً</span>
            </div>
            <textarea
              required
              rows={6}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white leading-relaxed focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? "جاري الإرسال الجماعي..." : "إرسال الرسالة للجميع عبر واتساب"}</span>
          </button>
        </form>

        {/* المعاينة الحية */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 h-fit">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <MessageCircle className="w-4 h-4" />
            <span>معاينة شكل الرسالة كما ستصل للطالب:</span>
          </div>

          <div className="bg-[#0b141a] p-4 rounded-2xl border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans shadow-inner">
            <div className="bg-[#005c4b] p-3 rounded-xl text-white whitespace-pre-wrap rounded-br-none shadow-sm">
              {messageText.replace(/\{name\}/g, "أحمد محمود")}
            </div>
            <div className="text-[10px] text-slate-400 mt-2 text-left font-mono">
              {new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })} ✓✓
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
