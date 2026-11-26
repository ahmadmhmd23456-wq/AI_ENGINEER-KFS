"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { GraduationCap, BookOpen, CreditCard, LogOut, ShieldCheck, Bot } from "lucide-react";
import AiCompanionWidget from "@/components/student/AiCompanionWidget";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems = [
    { label: "المواد الدراسية", href: "/student/courses", icon: BookOpen },
    { label: "بشمهندس زين", href: "/student/ai-companion", icon: Bot },
    { label: "مدفوعاتي واشتراكاتي", href: "/student/purchases", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col" dir="rtl">
      {/* الشريط العلوي لبوابة الطالب */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <Link href="/student/courses" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-sm text-white">منصة كلية الهندسة</div>
            <div className="text-[11px] text-blue-400">بوابة الطالب الذكية</div>
          </div>
        </Link>

        {/* روابط سطح المكتب */}
        <nav className="hidden sm:flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* معلومات الطالب وتسجيل الخروج */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-white">{session?.user?.name || "طالب هندسة"}</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>جهاز موثق</span>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-red-400 transition-all text-xs"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {children}
      </main>

      {/* زر ونافذة رفيق الطالب الذكي العائمة */}
      <AiCompanionWidget />

      {/* الشريط السفلي للموبايل (Mobile Tab Bar) */}
      <nav className="sm:hidden bg-slate-900/95 border-t border-slate-800 p-2 fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around backdrop-blur-md">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl text-[11px] font-bold transition-all ${
                isActive ? "text-blue-400 bg-blue-500/10" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
