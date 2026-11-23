"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ShieldAlert,
  FileQuestion,
  CreditCard,
  Send,
  LogOut,
  GraduationCap,
  Menu,
  X,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lockedCount, setLockedCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin/locked-accounts/count")
      .then((res) => res.json())
      .then((data) => setLockedCount(data.count || 0))
      .catch(() => {});
  }, [pathname]);

  const navItems = [
    { label: "لوحة التحكم", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "الدفعات والمواد", href: "/admin/subjects", icon: BookOpen },
    { label: "إدارة الطلاب", href: "/admin/students", icon: Users },
    {
      label: "الحسابات المقفولة",
      href: "/admin/locked-accounts",
      icon: ShieldAlert,
      badge: lockedCount > 0 ? lockedCount : null,
      badgeColor: "bg-red-500 text-white animate-pulse",
    },
    { label: "الامتحانات وبنك الأسئلة", href: "/admin/exams", icon: FileQuestion },
    { label: "المدفوعات والمبيعات", href: "/admin/payments", icon: CreditCard },
    { label: "رسالة جماعية (واتساب)", href: "/admin/broadcast", icon: Send },
  ];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col md:flex-row" dir="rtl">
      {/* القائمة الجانبية للشاشات الكبيرة */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900/80 border-l border-slate-800 p-5 justify-between">
        <div className="space-y-6">
          {/* الشعار */}
          <Link href="/admin/dashboard" className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">أكاديمية هندسة</div>
              <div className="text-[11px] text-blue-400 font-medium">لوحة المدرس (الأدمن)</div>
            </div>
          </Link>

          {/* روابط التنقل */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* معلومات الأستاذ وتسجيل الخروج */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="px-2">
            <div className="text-xs font-bold text-white truncate">
              {session?.user?.name || "د. محمد المهندس"}
            </div>
            <div className="text-[11px] text-slate-400 truncate font-mono">
              {session?.user?.email || "eng.teacher@gmail.com"}
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* الشريط العلوي للموبايل */}
      <header className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-bold text-sm text-white">لوحة تحكم المدرس</span>
        </div>

        {lockedCount > 0 && (
          <Link
            href="/admin/locked-accounts"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded-full text-xs animate-pulse"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{lockedCount} مقفول</span>
          </Link>
        )}
      </header>

      {/* القائمة المنسدلة في الموبايل */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold ${
                  isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && item.badge !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* المحتوى الرئيسي */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
