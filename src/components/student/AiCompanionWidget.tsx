"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Lock, X, Send, Sparkles, Bell, ArrowLeft } from "lucide-react";
import { playCyberClick } from "@/lib/sound";
import { getStickerById } from "@/lib/ai-stickers";

export default function AiCompanionWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unwatched, setUnwatched] = useState<any[]>([]);
  const [unfinished, setUnfinished] = useState<any[]>([]);
  const [quickMsg, setQuickMsg] = useState("");
  const [quickReply, setQuickReply] = useState<string | null>(null);
  const [quickSticker, setQuickSticker] = useState<string | null>(null);
  const [quickAiReaction, setQuickAiReaction] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const isOnAiPage = pathname === "/student/ai-companion";

  useEffect(() => {
    if (isOnAiPage) return;
    fetch("/api/student/ai-companion")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.context) return;
        const u = data.context.unwatchedLectures || [];
        const f = data.context.unfinishedLectures || [];
        setUnwatched(u);
        setUnfinished(f);
        setPendingCount(u.length + f.length);
      })
      .catch(() => {});
  }, [isOnAiPage, pathname]);

  if (isOnAiPage) return null;

  const handleQuickSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMsg.trim() || sending) return;
    playCyberClick();
    setSending(true);
    try {
      const res = await fetch("/api/student/ai-companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CHAT", message: quickMsg.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.assistantMessage?.content) {
        setQuickReply(data.assistantMessage.content);
        setQuickSticker(data.assistantMessage.sticker || null);
        setQuickAiReaction(data.userMessage?.aiReaction || null);
        setQuickMsg("");
      }
    } catch {
      // تجاهل
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40" dir="rtl">
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 bg-slate-900 border border-cyan-500/35 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-gradient-to-r from-cyan-950/90 to-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>رفيقك الذكي</span>
                  <Lock className="w-3 h-3 text-emerald-400" />
                </div>
                <div className="text-[10px] text-emerald-400">مشفر خاص بك وحدك (AES-256)</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3 max-h-80 overflow-y-auto text-xs">
            {pendingCount > 0 && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-1.5 text-[11px]">
                  <Bell className="w-3.5 h-3.5" />
                  <span>لديك {pendingCount} محاضرة تحتاج متابعتك:</span>
                </div>
                {unwatched[0] && (
                  <div className="text-[11px] text-slate-200">
                    🆕 {unwatched[0].subjectName}: {unwatched[0].lessonTitle}
                  </div>
                )}
                {unfinished[0] && (
                  <div className="text-[11px] text-slate-200">
                    ⏸️ لم تكمل: {unfinished[0].videoTitle} (دقيقة{" "}
                    {Math.max(1, Math.floor(unfinished[0].lastPositionSeconds / 60))})
                  </div>
                )}
              </div>
            )}

            {quickReply ? (
              <div className="space-y-2">
                {quickAiReaction && (
                  <div className="text-[11px] text-slate-400">
                    ريأكت زميلك على رسالتك: <span className="text-sm">{quickAiReaction}</span>
                  </div>
                )}
                {(() => {
                  const st = getStickerById(quickSticker);
                  return st ? (
                    <div
                      className={`p-2.5 rounded-2xl bg-gradient-to-br ${st.gradient} border ${st.border} flex items-center gap-2`}
                    >
                      <span className="text-2xl">{st.emoji}</span>
                      <span className={`text-[11px] font-bold ${st.textClass}`}>{st.label}</span>
                    </div>
                  ) : null;
                })()}
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 whitespace-pre-wrap leading-relaxed">
                  {quickReply}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 leading-relaxed">
                ارغي معايا في أي حاجة تيجي في بالك، أو افتح الشات الكامل.
              </p>
            )}
          </div>

          <form
            onSubmit={handleQuickSend}
            className="p-3 border-t border-slate-800 bg-slate-950/80 space-y-2"
          >
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={quickMsg}
                onChange={(e) => setQuickMsg(e.target.value)}
                placeholder="اكتب رسالة..."
                className="flex-1 py-2 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={sending || !quickMsg.trim()}
                className="p-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <Link
              href="/student/ai-companion"
              onClick={() => {
                playCyberClick();
                setIsOpen(false);
              }}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>فتح المحادثة الكاملة والتذكيرات</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </form>
        </div>
      )}

      {/* الزر العائم */}
      <button
        type="button"
        onClick={() => {
          playCyberClick();
          setIsOpen((prev) => !prev);
        }}
        className="relative group flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-xl shadow-cyan-600/30 border border-cyan-400/30 transition-all hover:scale-105 active:scale-95"
        title="رفيقك الذكي الشخصي"
      >
        <Bot className="w-5 h-5" />
        <span className="text-xs font-bold hidden sm:inline">رفيقي الذكي</span>
        {pendingCount > 0 && (
          <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold flex items-center justify-center shadow-md animate-bounce">
            {pendingCount}
          </span>
        )}
      </button>
    </div>
  );
}
