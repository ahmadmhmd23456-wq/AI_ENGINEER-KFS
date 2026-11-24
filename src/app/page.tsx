"use client";

import React from "react";
import Link from "next/link";
import {
  GraduationCap,
  ShieldCheck,
  Video,
  FileQuestion,
  CreditCard,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import {
  playCyberHover,
  playCyberClick,
} from "@/lib/sound";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-white selection:bg-blue-600 selection:text-white flex flex-col justify-between" dir="rtl">
      {/* الشريط العلوي */}
      <header className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 pulse-ring">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">أكاديمية هندسة</h1>
            <p className="text-[11px] text-blue-400">المنصة الرسمية لطلاب كلية الهندسة</p>
          </div>
        </div>

        <Link
          href="/login?mode=login"
          onMouseEnter={playCyberHover}
          onClick={playCyberClick}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/25 flex items-center gap-2 hover:scale-105 active:scale-95"
        >
          <span>تسجيل الدخول</span>
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center relative overflow-hidden w-full">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-6 anim-video-text">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>المنصة التعليمية الأولى لطلاب الهندسة في مصر</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight max-w-3xl mx-auto mb-6 anim-video-heading laser-shimmer-text">
            مستقبلك الهندسي يبدأ هنا مع أفضل شرح ومتابعة شخصية
          </h2>

          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mb-8 anim-video-text delay-100">
            منصة تعليمية متكاملة لجميع دفعات هندسة (إعدادي حتى بكالوريوس). محاضرات فيديو مشفرة، شيتات محلولة، وبنوك أسئلة بامتحانات عشوائية تقيس مستواك بدقة.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 anim-video-text delay-200">
            <Link
              href="/login?mode=login"
              onMouseEnter={playCyberHover}
              onClick={playCyberClick}
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
            >
              <span>تسجيل الدخول للمنصة</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <Link
              href="/login?mode=register"
              onMouseEnter={playCyberHover}
              onClick={playCyberClick}
              className="w-full sm:w-auto px-7 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-2xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
            >
              <span>إنشاء حساب طالب جديد</span>
            </Link>
          </div>

          {/* مميزات سريعة بتأثيرات الانيميشن والصوت */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto mt-12 text-xs text-slate-400 eng-scroll-item fox-scroll-item fox-delay-150">
            <div 
              onMouseEnter={playCyberHover}
              className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl hover:border-blue-500/40 transition-all hover:-translate-y-1"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1.5" />
              <span>حماية مشددة للحساب</span>
            </div>
            <div 
              onMouseEnter={playCyberHover}
              className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl hover:border-blue-500/40 transition-all hover:-translate-y-1"
            >
              <Video className="w-4 h-4 text-blue-400 mx-auto mb-1.5" />
              <span>فيديوهات HLS بدون تقطيع</span>
            </div>
            <div 
              onMouseEnter={playCyberHover}
              className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl hover:border-blue-500/40 transition-all hover:-translate-y-1"
            >
              <FileQuestion className="w-4 h-4 text-indigo-400 mx-auto mb-1.5" />
              <span>امتحانات بمحاولة واحدة</span>
            </div>
            <div 
              onMouseEnter={playCyberHover}
              className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl hover:border-blue-500/40 transition-all hover:-translate-y-1"
            >
              <CreditCard className="w-4 h-4 text-amber-400 mx-auto mb-1.5" />
              <span>فودافون كاش وانستاباي</span>
            </div>
          </div>
        </section>
      </main>

      {/* التذييل */}
      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500 w-full">
        منصة هندسة التعليمية &copy; {new Date().getFullYear()} - جميع الحقوق محفوظة للمدرس
      </footer>
    </div>
  );
}
