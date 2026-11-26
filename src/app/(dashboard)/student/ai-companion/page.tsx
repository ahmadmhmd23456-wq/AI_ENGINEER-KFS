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
  Smile,
  Sticker,
  ImagePlus,
  X,
} from "lucide-react";
import { playCyberClick, playCyberHover, playSuccessChime } from "@/lib/sound";
import { AI_STICKERS, REACTION_EMOJIS, getStickerById } from "@/lib/ai-stickers";

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  channel: string;
  content: string;
  sticker?: string | null;
  imageDataUrl?: string | null;
  imageUrl?: string | null;
  aiReaction?: string | null;
  userReaction?: string | null;
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
  const [showStickers, setShowStickers] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

  // إضافة سر جديد
  const [secretContent, setSecretContent] = useState("");
  const [secretCategory, setSecretCategory] = useState<"SECRET" | "GOAL" | "NOTE">("SECRET");
  const [savingSecret, setSavingSecret] = useState(false);

  // إرسال تذكير الهاتف
  const [sendingPhone, setSendingPhone] = useState(false);
  const [lastWaUrl, setLastWaUrl] = useState<string | null>(null);
  const [phoneToast, setPhoneToast] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const compressImageFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("فشل قراءة الصورة"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("صيغة الصورة غير صالحة"));
        img.onload = () => {
          const maxDim = 1280;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(String(reader.result));
            return;
          }
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.84));
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });

  const handleImageFilePicked = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    try {
      const compressed = await compressImageFile(file);
      setPendingImage(compressed);
      playCyberClick();
    } catch {
      // تجاهل
    }
  };

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

  const handleSendMessage = async (textOverride?: string, stickerOverride?: string) => {
    const text = (textOverride ?? inputMsg).trim();
    const stickerId = stickerOverride || null;
    const imageToSend = !textOverride && !stickerId ? pendingImage : null;
    if ((!text && !stickerId && !imageToSend) || sending) return;

    playCyberClick();
    if (!textOverride && !stickerId) {
      setInputMsg("");
      setPendingImage(null);
    }
    setShowStickers(false);
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
        sticker: stickerId,
        imageDataUrl: imageToSend,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await fetch("/api/student/ai-companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHAT",
          message: text,
          sticker: stickerId,
          imageDataUrl: imageToSend,
        }),
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
        if (data.savedNickname) {
          playSuccessChime();
          setSecrets((prev) => [
            {
              ...data.savedNickname,
              category: "NICKNAME",
              createdAt: new Date().toISOString(),
            },
            ...prev.filter((s) => s.category !== "NICKNAME"),
          ]);
          setContext((prev: any) =>
            prev
              ? {
                  ...prev,
                  user: { ...prev.user, preferredNickname: data.savedNickname.content },
                }
              : prev
          );
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

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    playCyberClick();
    setActiveReactionMsgId(null);

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, userReaction: m.userReaction === emoji ? null : emoji }
          : m
      )
    );

    try {
      await fetch("/api/student/ai-companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REACT", messageId, emoji }),
      });
    } catch {
      // تجاهل
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
          <p className="text-xs text-slate-400">جاري تجهيز شات بشمهندس زين...</p>
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
                <h1 className="text-xl sm:text-2xl font-bold text-white">بشمهندس زين</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                  <Lock className="w-3 h-3" />
                  <span>مشفر AES-256 لك وحدك</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                صاحبك في الكلية للدردشة والمذاكرة — كل محادثاتك وملاحظاتك مشفرة بالكامل وخاصة بحسابك وحدك (لا يطلع عليها أي شخص آخر)، وبيفكرك بالمحاضرات الجديدة واللي نسيت تكملها برسائل على رقمك الخاص.
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
            <span>ملاحظاتي الخاصة ({secrets.length})</span>
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isUser = msg.role === "USER";
                const stickerDef = getStickerById(msg.sticker);
                const reactionsList = [msg.aiReaction, msg.userReaction].filter(Boolean) as string[];
                const isPickerOpen = activeReactionMsgId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`group flex flex-col ${isUser ? "items-start" : "items-end"}`}
                  >
                    <div
                      className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap transition-all ${
                        isUser
                          ? "bg-blue-600 text-white rounded-br-sm shadow-md shadow-blue-600/20"
                          : "bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-bl-sm"
                      } ${reactionsList.length > 0 ? "mb-2.5" : ""}`}
                    >
                      {!isUser && (
                        <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-bold mb-1.5">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>بشمهندس زين</span>
                          {msg.channel === "WHATSAPP" && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                              اتبعَت لرقمك 📱
                            </span>
                          )}
                        </div>
                      )}

                      {stickerDef && (
                        <div
                          className={`mb-2 p-3 rounded-2xl bg-gradient-to-br ${stickerDef.gradient} border ${stickerDef.border} flex items-center gap-3 shadow-inner`}
                        >
                          <span className="text-3xl leading-none select-none drop-shadow">
                            {stickerDef.emoji}
                          </span>
                          <span className={`text-xs font-extrabold ${stickerDef.textClass}`}>
                            {stickerDef.label}
                          </span>
                        </div>
                      )}

                      {(msg.imageDataUrl || msg.imageUrl) && (
                        <button
                          type="button"
                          onClick={() => setPreviewModalImage((msg.imageDataUrl || msg.imageUrl)!)}
                          className="mb-2 block rounded-xl overflow-hidden border border-white/15 hover:opacity-95 transition-opacity"
                          title="تكبير الصورة"
                        >
                          <img
                            src={(msg.imageDataUrl || msg.imageUrl)!}
                            alt="صورة مرفقة"
                            className="max-h-60 w-auto object-contain rounded-xl bg-black/20"
                          />
                        </button>
                      )}

                      {msg.content && <div>{msg.content}</div>}

                      <div className="flex items-center justify-between gap-3 mt-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveReactionMsgId(isPickerOpen ? null : msg.id)
                          }
                          className={`p-1 rounded-full transition-all ${
                            isPickerOpen
                              ? "opacity-100 bg-slate-950/50 text-amber-300"
                              : "opacity-60 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-slate-950/40 text-white/80"
                          }`}
                          title="اعمل ريأكت على الرسالة"
                        >
                          <Smile className="w-3.5 h-3.5" />
                        </button>
                        <div className="text-[9px] opacity-55 font-mono text-left" dir="ltr">
                          {new Date(msg.createdAt).toLocaleTimeString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>

                      {/* شارة الريأكت المثبتة على الرسالة */}
                      {reactionsList.length > 0 && (
                        <div
                          className={`absolute -bottom-3 ${
                            isUser ? "left-3" : "right-3"
                          } flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950 border border-slate-700 shadow-lg text-xs select-none`}
                        >
                          {reactionsList.map((emo, idx) => (
                            <span key={`${emo}-${idx}`} className="leading-none">
                              {emo}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* شريط اختيار الريأكت */}
                    {isPickerOpen && (
                      <div className="mt-1.5 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-950 border border-slate-700 shadow-xl z-20 animate-in fade-in zoom-in-95 duration-150">
                        {REACTION_EMOJIS.map((emo) => (
                          <button
                            key={emo}
                            type="button"
                            onClick={() => handleToggleReaction(msg.id, emo)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-sm hover:scale-125 transition-transform ${
                              msg.userReaction === emo ? "bg-cyan-600/30 ring-1 ring-cyan-400" : ""
                            }`}
                          >
                            {emo}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {sending && (
                <div className="flex justify-end">
                  <div className="bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-cyan-300 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>بيكتب...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* درج الاستيكرز السريع */}
            {showStickers && (
              <div className="p-3 bg-slate-950/95 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                {AI_STICKERS.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    disabled={sending}
                    onClick={() => handleSendMessage("", st.id)}
                    className={`p-2 rounded-xl bg-gradient-to-br ${st.gradient} border ${st.border} hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-2 text-right`}
                  >
                    <span className="text-xl shrink-0">{st.emoji}</span>
                    <span className={`text-[10px] font-bold leading-tight ${st.textClass}`}>
                      {st.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* اختصارات سريعة */}
            <div className="px-3 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
              {[
                "عامل إيه؟",
                "احكيلي حاجة تضحك 😂",
                "عندي محاضرات إيه؟",
                "مخنوق ومحتاج أفصل",
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 hover:text-white whitespace-nowrap border border-slate-700 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* معاينة الصورة المختارة قبل الإرسال */}
            {pendingImage && (
              <div className="px-3 py-2 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <img
                      src={pendingImage}
                      alt="معاينة الصورة"
                      className="h-14 w-14 object-cover rounded-xl border border-cyan-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => setPendingImage(null)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow"
                      title="إزالة الصورة"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-[11px] text-cyan-300 font-semibold">
                    📸 صورة السؤال جاهزة للإرسال — اكتب سؤالك أو ابعتها مباشرة!
                  </div>
                </div>
              </div>
            )}

            {/* حقل الإرسال + زر الاستيكرز + زر رفع صورة */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  handleImageFilePicked(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-2.5 rounded-xl border transition-all ${
                  pendingImage
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-300"
                }`}
                title="رفع صورة سؤال"
              >
                <ImagePlus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  playCyberClick();
                  setShowStickers((prev) => !prev);
                }}
                className={`p-2.5 rounded-xl border transition-all ${
                  showStickers
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-300"
                }`}
                title="إرسال استيكر"
              >
                <Sticker className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onPaste={(e) => {
                  const items = e.clipboardData?.items;
                  if (!items) return;
                  for (let i = 0; i < items.length; i++) {
                    if (items[i].type.startsWith("image/")) {
                      const file = items[i].getAsFile();
                      if (file) handleImageFilePicked(file);
                      break;
                    }
                  }
                }}
                placeholder={
                  pendingImage
                    ? "اكتب ملاحظة مع الصورة أو اضغط إرسال..."
                    : "اكتب رسالة لصاحبك، الصق/ارفع صورة سؤال، أو ابعت استيكر..."
                }
                className="flex-1 py-2.5 px-3.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={sending || (!inputMsg.trim() && !pendingImage)}
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
                <span>خصوصية تامة</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                محادثاتك وملاحظاتك مشفرة تلقائياً بمفتاح خاص بحسابك (AES-256-GCM)؛ لا يوجد أي صلاحية لأي شخص آخر أو للأدمن لقراءتها.
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
                <h3 className="text-sm font-bold text-white">إضافة ملاحظة أو هدف جديد</h3>
                <p className="text-[11px] text-slate-400">مشفرة وخاصة بحسابك فقط</p>
              </div>
            </div>

            <form onSubmit={handleAddSecret} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "SECRET", label: "🔒 ملاحظة خاصة" },
                  { id: "GOAL", label: "🎯 هدف" },
                  { id: "NOTE", label: "📝 تذكرة" },
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
                placeholder="اكتب ملاحظتك، هدفك الدراسي، أو أي حاجة حابب تحتفظ بيها هنا..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />

              <button
                type="submit"
                disabled={savingSecret || !secretContent.trim()}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{savingSecret ? "جاري الحفظ..." : "حفظ في ملاحظاتي الخاصة"}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-violet-400" />
                <span>ملاحظاتي المحفوظة ({secrets.length})</span>
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono">AES-256-GCM Encrypted</span>
            </div>

            {secrets.length === 0 ? (
              <div className="p-10 bg-slate-950/50 border border-slate-800 rounded-2xl text-center space-y-2">
                <Lock className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  مفيش ملاحظات محفوظة حالياً. تقدر تحفظ هنا أهدافك أو أي حاجة حابب تحتفظ بيها لنفسك.
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
                          {sec.category === "NICKNAME"
                            ? "🏷️ الاسم المفضل"
                            : sec.category === "GOAL"
                            ? "🎯 هدف"
                            : sec.category === "NOTE"
                            ? "📝 تذكرة"
                            : "🔒 ملاحظة خاصة"}
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
              عند تفعيل التذكير التلقائي، سيبعثلك بشمهندس زين رسالة على رقمك الشخصي فور نزول أي محاضرة جديدة في موادك، أو يفكرك لو بدأت محاضرة ونسيت تكملها.
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

      {/* نافذة تكبير الصورة */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewModalImage(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewModalImage(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-slate-900 border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={previewModalImage}
            alt="صورة مكبرة"
            className="max-w-full max-h-[88vh] rounded-2xl border border-slate-700 shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
