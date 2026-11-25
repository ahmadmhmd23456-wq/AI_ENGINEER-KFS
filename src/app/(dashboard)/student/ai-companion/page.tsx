"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Bot,
  Lock,
  Send,
  Sparkles,
  ShieldCheck,
  Bell,
  Phone,
  MessageCircle,
  Trash2,
  Plus,
  Play,
  Clock,
  BookOpen,
  RefreshCw,
  CheckCircle2,
  EyeOff,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { playCyberClick, playCyberHover, playSuccessChime } from "@/lib/sound";

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  channel: string;
  content: string;
  createdAt: string;
}

interface SecretItem {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
}

export default function StudentAiCompanionPage() {
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [secrets, setSecrets] = useState<SecretItem[]>([]);
  const [phoneLogs, setPhoneLogs] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<"CHAT" | "SECRETS" | "REMINDERS">("CHAT");
  const [inputMsg, setInputMsg] = useState("");
  const [sending, setSending] = useState(false);

  // إضافة سر جديد
  const [secretContent, setSecretContent] = useState("");
  const [secretCategory, setSecretCategory] = useState<"SECRET" | "GOAL" | "NOTE">("SECRET");
  const [savingSecret, setSavingSecret] = useState(false);

  // إرسال تذكير الهاتف
  const [sendingPhone, setSendingPhone] = useState(false);
  const [lastWaUrl, setLastWaUrl] = useState<string | null>(null);
  const [phoneToast, setPhoneToast] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/student/ai-companion");
      const data = await res.json();
      if (res.ok) {
        setContext(data.context);
        setMessages(data.messages || []);
        setSecrets(data.secrets || []);
        setPhoneLogs(data.phoneLogs || []);
      }
    } catch {
      // تجاهل
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  const handleSendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? inputMsg).trim();
    if (!text || sending) return;

    playCyberClick();
    if (!textOverride) setInputMsg("");
    setSending(true);

    // إضافة فورية متفائلة لرسالة الطالب
    const tempId = "temp-" + Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        role: "USER",
        channel: "WEB",
        content: text,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await fetch("/api/student/ai-companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CHAT", message: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempId),
          data.userMessage,
          data.assistantMessage,
        ]);
        if (data.savedSecret) {
          playSuccessChime();
          setSecrets((prev) => [
            {
              ...data.savedSecret,
              category: "SECRET",
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
        if (data.phoneDispatch?.waDirectUrl) {
          setLastWaUrl(data.phoneDispatch.waDirectUrl);
          fetchData();
        }
      }
    } catch {
      // تجاهل
    } finally {
      setSending(false);
    }
  };

  const handleAddSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretContent.trim() || savingSecret) return;
    setSavingSecret(true);
    playCyberClick();

    try {
      const res = await fetch("/api/student/ai-companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_SECRET",
          content: secretContent.trim(),
          category: secretCategory,
        }),
      });
      const data = await res.json();
      if (res.ok && data.secret) {
        playSuccessChime();
        setSecrets((prev) => [data.secret, ...prev]);
        setSecretContent("");
      }
    } catch {
      // تجاهل
    } finally {
      setSavingSecret(false);
    }
  };

  const handleDeleteSecret = async (secretId: string) => {
    playCyberClick();
    try {
      const res = await fetch("/api/student/ai-companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE_SECRET", secretId }),
      });
      if (res.ok) {
        setSecrets((prev) => prev.filter((s) => s.id !== secretId));
      }
    } catch {
      // تجاهل
    }
  };

  const handleClearChat = async () => {
    if (!confirm("هل تريد مسح سجل الدردشة بالكامل؟ (ستبقى أسرارك المحفوظة في الخزنة كما هي)")) return;
    playCyberClick();
    try {
      const res = await fetch("/api/student/ai-companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLEAR_CHAT" }),
      });
      if (res.ok) {
        setMessages([]);
        fetchData();
      }
    } catch {
      // تجاهل
    }
  };

  const handleTogglePhoneReminders = async () => {
    if (!context) return;
    const nextVal = !context.user.aiWhatsappReminders;
    playCyberClick();
    setContext((prev: any) => ({
      ...prev,
      user: { ...prev.user, aiWhatsappReminders: nextVal },
    }));

    await fetch("/api/student/ai-companion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "TOGGLE_PHONE_REMINDERS", enabled: nextVal }),
    });
  };

  const handleSendPhoneReminder = async () => {
    setSendingPhone(true);
    setPhoneToast(null);
    playCyberClick();

    try {
      const res = await fetch("/api/student/ai-companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SEND_PHONE_REMINDER" }),
      });
      const data = await res.json();
      if (res.ok) {
        playSuccessChime();
        setLastWaUrl(data.waDirectUrl);
        setPhoneToast(`تم إرسال التذكير لرقمك الخاص (${data.phone}) بنجاح!`);
        fetchData();
      } else {
        setPhoneToast(data.error || "تعذر إرسال التذكير");
      }
    } catch {
      setPhoneToast("حدث خطأ أثناء الاتصال");
    } finally {
      setSendingPhone(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-slate-400">جاري فتح خزنتك المشفرة ورفيقك الذكي...</p>
        </div>
      </div>
    );
  }

  const unwatched = context?.unwatchedLectures || [];
  const unfinished = context?.unfinishedLectures || [];
  const pendingCount = unwatched.length + unfinished.length;

  return (
    <div className="space-y-6 pb-20 sm:pb-6" dir="rtl">
      {/* رأس الصفحة وضمان الخصوصية المطلقة */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0d1628] to-slate-900 border border-cyan-500/25 p-5 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 flex-shrink-0">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">رفيقك الذكي الشخصي</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                  <Lock className="w-3 h-3" />
                  <span>مشفر AES-256 لك وحدك</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                احكي معاه براحتك واحفظ أسرارك وأهدافك بتشفير خاص بحسابك فقط (لا يطلع عليها أي طالب ولا حتى إدارة المنصة)، وبيفكرك بالمحاضرات الجديدة واللي نسيت تكملها عبر رسائل على رقمك الخاص.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={handleSendPhoneReminder}
              disabled={sendingPhone}
              className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{sendingPhone ? "جاري الإرسال..." : "ابعتلي تذكير لرقمي"}</span>
            </button>
          </div>
        </div>

        {/* تبويبات الموبايل والكمبيوتر */}
        <div className="relative flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              playCyberClick();
              setActiveTab("CHAT");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === "CHAT"
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/25"
                : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>المحادثة الخاصة</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playCyberClick();
              setActiveTab("SECRETS");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === "SECRETS"
                ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25"
                : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>خزنة أسراري ({secrets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playCyberClick();
              setActiveTab("REMINDERS");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === "REMINDERS"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>تنبيهات المحاضرات ورقمي</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* إشعار إرسال الهاتف */}
      {phoneToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{phoneToast}</span>
          </div>
          {lastWaUrl && (
            <a
              href={lastWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>فتح الرسالة في واتساب</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* القسم 1: الدردشة الذكية */}
      {activeTab === "CHAT" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-col h-[560px] shadow-2xl overflow-hidden">
            {/* شريط الخصوصية داخل الشات */}
            <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-semibold">جلسة سرية مشفرة • خاصة بحسابك فقط</span>
              </div>
              <button
                type="button"
                onClick={handleClearChat}
                className="text-[11px] text-slate-500 hover:text-red-400 flex items-center gap-1 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح السجل</span>
              </button>
            </div>

            {/* قائمة الرسائل */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const isUser = msg.role === "USER";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? "bg-blue-600 text-white rounded-br-sm shadow-md shadow-blue-600/20"
                          : "bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-bl-sm"
                      }`}
                    >
                      {!isUser && (
                        <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-bold mb-1">
                          <Bot className="w-3.5 h-3.5" />
                          <span>رفيقك الذكي</span>
                          {msg.channel === "WHATSAPP" && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                              أُرسلت لرقمك 📱
                            </span>
                          )}
                        </div>
                      )}
                      <div>{msg.content}</div>
                      <div className="text-[9px] opacity-55 mt-1.5 font-mono text-left" dir="ltr">
                        {new Date(msg.createdAt).toLocaleTimeString("ar-EG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              {sending && (
                <div className="flex justify-end">
                  <div className="bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-cyan-300 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>رفيقك الذكي بيفكر...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* اختصارات ذكية سريعة */}
            <div className="px-3 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
              {[
                "عندي محاضرات إيه جديدة أو نسيتها؟",
                "ابعتلي تذكير بالمحاضرات على رقمي",
                "احفظ سر: ",
                "مضغوط في المذاكرة ومحتاج تشجيع",
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    if (prompt.endsWith(": ")) {
                      setInputMsg(prompt);
                    } else {
                      handleSendMessage(prompt);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 hover:text-white whitespace-nowrap border border-slate-700 transition-all"
                >
                  {prompt.replace(/: $/, "...")}
                </button>
              ))}
            </div>

            {/* حقل الإرسال */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder="احكيلي أي سر، اسألني عن محاضراتك، أو اطلب أبعتلك رسالة على رقمك..."
                className="flex-1 py-2.5 px-3.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={sending || !inputMsg.trim()}
                className="p-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">إرسال</span>
              </button>
            </form>
          </div>

          {/* الشريط الجانبي المختصر لحالة المحاضرات */}
          <div className="space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>تذكيرات المحاضرات الحالية</span>
              </h3>

              {pendingCount === 0 ? (
                <p className="text-xs text-slate-400 leading-relaxed">
                  ✨ مفيش محاضرات متأخرة أو ناقصة حالياً. أول ما تنزل محاضرة جديدة هبعتلك فوراً!
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {unwatched.slice(0, 4).map((item: any) => (
                    <Link
                      key={item.videoId}
                      href={`/student/courses/${item.subjectId}`}
                      className="block p-3 rounded-2xl bg-blue-950/30 border border-blue-800/40 hover:border-blue-500 transition-all text-xs"
                    >
                      <div className="text-[10px] text-blue-400 font-bold mb-0.5">🆕 محاضرة جديدة</div>
                      <div className="font-bold text-white">{item.lessonTitle}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.subjectName}</div>
                    </Link>
                  ))}

                  {unfinished.slice(0, 4).map((item: any) => (
                    <Link
                      key={item.videoId}
                      href={`/student/courses/${item.subjectId}`}
                      className="block p-3 rounded-2xl bg-amber-950/30 border border-amber-800/40 hover:border-amber-500 transition-all text-xs"
                    >
                      <div className="text-[10px] text-amber-400 font-bold mb-0.5">
                        ⏸️ نسيت تكملها (الدقيقة {Math.max(1, Math.floor(item.lastPositionSeconds / 60))})
                      </div>
                      <div className="font-bold text-white">{item.videoTitle}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.subjectName}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-900/80 border border-violet-500/20 rounded-3xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-violet-300 text-xs font-bold">
                <EyeOff className="w-4 h-4" />
                <span>ضمان السرية التامة</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                كلامك وأسرارك يتم تشفيرها بمفتاح خاص بحسابك (`AES-256-GCM`) قبل حفظها؛ لا يوجد أي صلاحية لأي شخص آخر أو للأدمن لقراءتها.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* القسم 2: خزنة الأسرار المشفرة */}
      {activeTab === "SECRETS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900/90 border border-violet-500/30 rounded-3xl p-5 space-y-4 h-fit">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">إضافة سر أو هدف جديد</h3>
                <p className="text-[11px] text-slate-400">مشفر ولا يراه غيرك أبداً</p>
              </div>
            </div>

            <form onSubmit={handleAddSecret} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "SECRET", label: "🔒 سر خاص" },
                  { id: "GOAL", label: "🎯 هدف" },
                  { id: "NOTE", label: "📝 فضفضة" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSecretCategory(cat.id as any)}
                    className={`py-2 rounded-xl font-bold border transition-all text-[11px] ${
                      secretCategory === cat.id
                        ? "bg-violet-600 text-white border-violet-500"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <textarea
                rows={4}
                required
                value={secretContent}
                onChange={(e) => setSecretContent(e.target.value)}
                placeholder="اكتب أي سر أو هدف أو حاجة حابب تحتفظ بيها بينك وبين رفيقك الذكي..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />

              <button
                type="submit"
                disabled={savingSecret || !secretContent.trim()}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{savingSecret ? "جاري التشفير والحفظ..." : "حفظ في خزنتي المشفرة"}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-violet-400" />
                <span>أسراري المحفوظة ({secrets.length})</span>
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono">AES-256-GCM Encrypted</span>
            </div>

            {secrets.length === 0 ? (
              <div className="p-10 bg-slate-950/50 border border-slate-800 rounded-2xl text-center space-y-2">
                <Lock className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  خزنتك السرية فاضية حالياً. أي سر تحفظه هنا أو في الشات بيتشفر لحسابك لوحدك.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {secrets.map((sec) => (
                  <div
                    key={sec.id}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30 font-bold">
                          {sec.category === "GOAL" ? "🎯 هدف" : sec.category === "NOTE" ? "📝 فضفضة" : "🔒 سر"}
                        </span>
                        <span className="text-slate-500 font-mono">
                          {new Date(sec.createdAt).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {sec.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSecret(sec.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
                      title="حذف نهائي"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* القسم 3: تنبيهات المحاضرات والتواصل على الرقم الخاص */}
      {activeTab === "REMINDERS" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">التواصل عبر رقمك الخاص</h3>
                  <p className="text-[11px] text-slate-400 font-mono" dir="ltr">
                    {context?.user?.phone || "لم يتم تسجيل رقم"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTogglePhoneReminders}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  context?.user?.aiWhatsappReminders
                    ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/40"
                    : "bg-slate-950 text-slate-400 border-slate-800"
                }`}
              >
                {context?.user?.aiWhatsappReminders ? "✅ التذكير التلقائي مُفعّل" : "🔕 التذكير التلقائي متوقف"}
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              عند تفعيل التذكير التلقائي، سيبعثلك رفيقك الذكي رسالة على رقمك الشخصي فور نزول أي محاضرة جديدة في موادك، أو يفكرك لو بدأت محاضرة ونسيت تكملها.
            </p>

            <button
              type="button"
              onClick={handleSendPhoneReminder}
              disabled={sendingPhone}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{sendingPhone ? "جاري الإرسال..." : "إرسال ملخص وتذكير لرقمي الآن"}</span>
            </button>

            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-slate-300">سجل الرسائل المرسلة لرقمك:</div>
              {phoneLogs.length === 0 ? (
                <p className="text-[11px] text-slate-500">لم يتم إرسال رسائل تذكير لرقمك بعد.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {phoneLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-emerald-400 font-bold">{log.title}</span>
                        <span className="text-slate-500 font-mono">
                          {new Date(log.createdAt).toLocaleString("ar-EG")}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {log.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>محاضرات تحتاج متابعتك ({pendingCount})</span>
            </h3>

            {pendingCount === 0 ? (
              <div className="p-8 bg-slate-950/60 border border-slate-800 rounded-2xl text-center">
                <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-slate-300">أنت متابع كل محاضراتك أول بأول! 👏</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {unwatched.map((item: any) => (
                  <Link
                    key={item.videoId}
                    href={`/student/courses/${item.subjectId}`}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-blue-800/40 hover:border-blue-500 flex items-center justify-between gap-3 transition-all"
                  >
                    <div>
                      <span className="text-[10px] text-blue-400 font-bold">🆕 محاضرة جديدة لم تُشاهد</span>
                      <div className="text-xs font-bold text-white mt-0.5">{item.lessonTitle}</div>
                      <div className="text-[11px] text-slate-400">{item.subjectName}</div>
                    </div>
                    <Play className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  </Link>
                ))}

                {unfinished.map((item: any) => (
                  <Link
                    key={item.videoId}
                    href={`/student/courses/${item.subjectId}`}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-amber-800/40 hover:border-amber-500 flex items-center justify-between gap-3 transition-all"
                  >
                    <div>
                      <span className="text-[10px] text-amber-400 font-bold">
                        ⏸️ نسيت تكملها (توقفت عند الدقيقة {Math.max(1, Math.floor(item.lastPositionSeconds / 60))})
                      </span>
                      <div className="text-xs font-bold text-white mt-0.5">{item.videoTitle}</div>
                      <div className="text-[11px] text-slate-400">{item.subjectName}</div>
                    </div>
                    <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
