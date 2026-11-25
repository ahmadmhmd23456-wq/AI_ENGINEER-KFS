"use client";

import React from "react";
import { ShieldAlert, MessageCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { signOut } from "next-auth/react";

export default function AccountLockedPage() {
  const adminPhone = "201065375309"; // رقم الأدمن م/ أحمد
  const whatsappUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(
    "السلام عليكم م/ أحمد، حسابي في منصة هندسة تم إيقافه أمنياً وأرغب في مراجعة سبب القفل وفك الحظر."
  )}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* شريط أحمر جمالي في الأعلى */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse" />

        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6 shadow-inner">
            <ShieldAlert className="w-10 h-10 animate-bounce" />
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 mb-3">
            حالة الحساب: مقفول أمنياً (LOCKED)
          </span>

          <h1 className="text-2xl font-bold text-white mb-2">تم حظر وإيقاف حسابك</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            تم إيقاف الحساب فوراً بسبب رصد محاولة تصوير أو تسجيل شاشة لمحتوى المحاضرات، أو محاولة دخول غير مصرح بها من جهاز آخر. تم تسجيل الواقعة وإخطار م/ أحمد.
          </p>

          <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-right mb-6 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>لا يمكن فك الحظر إلا بواسطة مدرس المادة حصراً.</span>
            </div>
            <p className="text-xs text-slate-400 pr-6">
              سيتواصل معك الأستاذ أو يمكنك المبادرة بمراسلته مباشرة على الواتساب لتوضيح سبب محاولة الدخول وتصريح جهازك.
            </p>
          </div>

          <div className="w-full space-y-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30 text-sm"
            >
              <MessageCircle className="w-5 h-5" />
              <span>تواصل مع المدرس عبر واتساب الآن</span>
            </a>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-sm"
            >
              <span>تسجيل الخروج والعودة للرئيسية</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
