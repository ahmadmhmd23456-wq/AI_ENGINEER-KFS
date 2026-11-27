"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Lock,
  Unlock,
  CheckCircle2,
  CreditCard,
  Smartphone,
  Zap,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  X,
  GraduationCap,
  Video,
  FileQuestion,
  FileText,
  Sparkles,
  Heart,
  Cpu,
  Bot,
  Compass,
  Building2,
  Check,
  Layers,
  Settings2,
  Copy,
  MessageCircle,
  Calendar,
} from "lucide-react";
import {
  playCyberHover,
  playCyberClick,
  playWhoosh,
  playSuccessChime,
} from "@/lib/sound";

interface DepartmentInfo {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  icon: any;
  colorName: string;
  gradient: string;
  border: string;
  hoverBorder: string;
  glow: string;
  textCol: string;
  tagClass: string;
  description: string;
  focusTopics: string[];
}

const DEPARTMENTS: DepartmentInfo[] = [
  {
    id: "AI",
    name: "هندسة الذكاء الاصطناعي",
    shortName: "ذكاء اصطناعي",
    badge: "AI & Smart Systems",
    icon: Cpu,
    colorName: "cyan",
    gradient: "from-cyan-950/40 via-blue-950/30 to-slate-900",
    border: "border-cyan-500/30",
    hoverBorder: "hover:border-cyan-400",
    glow: "shadow-cyan-500/20",
    textCol: "text-cyan-400",
    tagClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    description: "التعلم الآلي والعميق، خوارزميات الرؤية الحاسوبية، النظم الخبيرة، ومعالجة البيانات والذكاء الاصطناعي التوليدي.",
    focusTopics: ["تعلم الآلة والعميق", "رؤية حاسوبية", "بايثون المتقدمة", "خوارزميات وهياكل بيانات"]
  },
  {
    id: "MECHATRONICS",
    name: "هندسة الميكاترونكس والروبوتات",
    shortName: "ميكاترونكس",
    badge: "Robotics & Automation",
    icon: Bot,
    colorName: "amber",
    gradient: "from-amber-950/40 via-orange-950/30 to-slate-900",
    border: "border-amber-500/30",
    hoverBorder: "hover:border-amber-400",
    glow: "shadow-amber-500/20",
    textCol: "text-amber-400",
    tagClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    description: "الأنظمة الميكانيكية الذكية، الروبوتات الصناعية، التحكم الآلي PLC، والدوائر الإلكترونية المدمجة.",
    focusTopics: ["التحكم الآلي والروبوتات", "دوائر إلكترونية وأنظمة مدمجة", "ميكانيكا دقيقة وحساسات", "برمجة المتحكمات Microcontrollers"]
  },
  {
    id: "ARCHITECTURE",
    name: "الهندسة المعمارية والتصميم",
    shortName: "معماري",
    badge: "Architecture & Design",
    icon: Compass,
    colorName: "emerald",
    gradient: "from-emerald-950/40 via-teal-950/30 to-slate-900",
    border: "border-emerald-500/30",
    hoverBorder: "hover:border-emerald-400",
    glow: "shadow-emerald-500/20",
    textCol: "text-emerald-400",
    tagClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    description: "التصميم والتخطيط المعماري، الإظهار الرقمي وتقنيات BIM، نظريات وتاريخ العمارة، وتكنولوجيا البناء والتشييد.",
    focusTopics: ["التصميم المعماري الإبداعي", "الإظهار المعماري والـ BIM", "نظريات وتاريخ العمارة", "تكنولوجيا وخامات البناء"]
  },
  {
    id: "CIVIL",
    name: "الهندسة المدنية والإنشائية",
    shortName: "مدني",
    badge: "Civil & Structural",
    icon: Building2,
    colorName: "blue",
    gradient: "from-blue-950/40 via-indigo-950/30 to-slate-900",
    border: "border-blue-500/30",
    hoverBorder: "hover:border-blue-400",
    glow: "shadow-blue-500/20",
    textCol: "text-blue-400",
    tagClass: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    description: "تحليل وتصميم المنشآت الخرسانية والمعدنية، ميكانيكا التربة والأساسات، هندسة المساحة، وإدارة المشروعات.",
    focusTopics: ["تحليل إنشائي وخرسانة مسلحة", "ميكانيكا التربة والأساسات", "هندسة المساحة والطرق", "إدارة مشروعات التشييد"]
  }
];

export default function StudentCoursesPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTerm, setCurrentTerm] = useState<1 | 2>(1);

  // القسم المعين للطالب من قاعدة البيانات (يُعدّل فقط من خلال الأدمن)
  const [selectedDept, setSelectedDept] = useState<string>("ALL");

  // حالة مودال طلب تفعيل مادة واحدة (300 ج.م) أو عرض كل المواد (1200 ج.م)
  const [selectedSubjectToBuy, setSelectedSubjectToBuy] = useState<any | null>(null);
  const [isActivationOpen, setIsActivationOpen] = useState(false);
  const [activationMode, setActivationMode] = useState<"SINGLE" | "BUNDLE">("SINGLE");
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const BUNDLE_PRICE = 1200;

  const LEVEL1_DEPARTMENT_SCHEDULES: Record<string, { title: string; image: string }> = {
    AI: {
      title: "جدول المستوى الأول — الذكاء الاصطناعي (الترم الأول)",
      image: "/schedules/ai-level-1-term-1.jpg",
    },
    MECHATRONICS: {
      title: "جدول المستوى الأول — الميكاترونكس (الترم الأول)",
      image: "/schedules/mechatronics-level-1-term-1.jpg",
    },
    ARCHITECTURE: {
      title: "جدول المستوى الأول — العمارة الرقمية (الترم الأول)",
      image: "/schedules/architecture-level-1-term-1.jpg",
    },
    CIVIL: {
      title: "جدول المستوى الأول — الهندسة الإنشائية / المدنية (الترم الأول)",
      image: "/schedules/civil-level-1-term-1.jpg",
    },
  };

  const fetchCourses = () => {
    setLoading(true);
    fetch("/api/student/courses")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        const isPrepUser = json?.user?.academicLevel?.slug === "prep";
        const assignedDept = isPrepUser
          ? "GENERAL"
          : json?.user?.department || "ALL";
        setSelectedDept(assignedDept);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-xs text-slate-400">جاري تحميل موادك الدراسية...</p>
        </div>
      </div>
    );
  }

  const { user, subjects } = data || {};

  // فلترة المواد حسب الترم والقسم المسجل، وترتيبها وفق الترتيب المحدد من قبل الأدمن
  const termSubjects = (subjects || [])
    .filter((s: any) => {
      const matchTerm = s.term === currentTerm;
      if (!matchTerm) return false;
      if (selectedDept === "ALL") return true;
      const dept = s.department || "GENERAL";
      return dept === selectedDept || dept === "GENERAL";
    })
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

  const isPrepUser = user?.academicLevel?.slug === "prep";
  const activeDeptSchedule =
    !isPrepUser &&
    (!user?.academicLevel?.slug || user.academicLevel.slug === "level-1") &&
    currentTerm === 1
      ? LEVEL1_DEPARTMENT_SCHEDULES[selectedDept] || null
      : null;

  return (
    <div className="space-y-6" dir="rtl">
      {/* بطاقة ترحيبية ومعلومات الدفعة */}
      <div className="eng-scroll-item fox-scroll-item bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-blue-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-xs font-bold flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4" />
                <span>{user?.academicLevel?.name || "إعدادي هندسة"}</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white">
              مرحباً يا بشمهندس، {user?.name || ""} 👋
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {isPrepUser
                ? "مقررات وتدريبات الفرقة الإعدادية العامة. يمكنك الدخول لأي مادة لمتابعة المحاضرات والشيتات وبنوك الأسئلة."
                : "مقرراتك وتدريباتك الدراسية المسجلة. يمكنك الدخول لأي مادة لمتابعة المحاضرات والشيتات وبنوك الأسئلة، أو مراجعة بيانات قسمك من صفحة حسابي."}
            </p>
          </div>

          {/* محدد الترم الدراسي */}
          <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1 self-start lg:self-auto">
            <button
              onClick={() => {
                playWhoosh();
                setCurrentTerm(1);
              }}
              onMouseEnter={playCyberHover}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTerm === 1 ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400 hover:text-white"
              }`}
            >
              الترم الأول
            </button>
            <button
              onClick={() => {
                playWhoosh();
                setCurrentTerm(2);
              }}
              onMouseEnter={playCyberHover}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTerm === 2 ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400 hover:text-white"
              }`}
            >
              الترم الثاني
            </button>
          </div>
        </div>
      </div>

      {/* بطاقة عرض كل المواد (1200 ج.م) مقابل شحن المادة الواحدة (300 ج.م) */}
      {termSubjects.length > 0 && (() => {
        const lockedCount = termSubjects.filter((s: any) => !s.isPurchased).length;
        const singleSubjectsTotal = termSubjects.reduce(
          (sum: number, s: any) => sum + (Number(s.price) || 300),
          0
        );
        const savings = Math.max(0, singleSubjectsTotal - BUNDLE_PRICE);
        if (lockedCount === 0) return null;

        return (
          <div className="bg-gradient-to-r from-amber-950/60 via-orange-950/40 to-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/35 text-amber-300 text-[11px] font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>باقة العرض الكامل للترم — وفّر أكثر!</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                فعّل كل مواد القسم دفعة واحدة بـ <span className="text-amber-300 font-mono">1200 ج.م</span> فقط!
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                سعر المادة الواحدة <span className="font-mono font-bold text-emerald-400">300 ج.م</span>
                {savings > 0 && (
                  <>
                    {" "}— بدلاً من{" "}
                    <span className="line-through text-slate-400 font-mono">{singleSubjectsTotal} ج.م</span>
                    {" "}(وفّر <span className="font-bold text-amber-300 font-mono">{savings} ج.م</span> عند شحن كل المواد معاً)
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  playCyberClick();
                  const firstLocked = termSubjects.find((s: any) => !s.isPurchased) || termSubjects[0];
                  setSelectedSubjectToBuy(firstLocked || null);
                  setActivationMode("BUNDLE");
                  setIsActivationOpen(true);
                }}
                onMouseEnter={playCyberHover}
                className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Zap className="w-4 h-4" />
                <span>تفعيل عرض كل المواد (1200 ج.م)</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* قائمة المواد الدراسية */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">
              المقررات الدراسية
            </h3>
          </div>
          <div className="flex items-center gap-2.5">
            {activeDeptSchedule && (
              <button
                type="button"
                onClick={() => {
                  playCyberClick();
                  setShowScheduleModal(true);
                }}
                onMouseEnter={playCyberHover}
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-all"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>جدول المحاضرات والسكاشن</span>
              </button>
            )}
            <span className="text-xs text-slate-400 font-mono">
              {termSubjects.length} مواد متاحة
            </span>
          </div>
        </div>

        {termSubjects.map((sub: any, index: number) => {
          const isUnlocked = sub.isPurchased;
          const scrollDelay = index === 0 ? "fox-delay-75" : index === 1 ? "fox-delay-150" : index === 2 ? "fox-delay-200" : index === 3 ? "fox-delay-250" : "fox-delay-300";
          return (
            <div
              key={sub.id}
              onMouseEnter={playCyberHover}
              className={`eng-scroll-item fox-scroll-item ${scrollDelay} rounded-2xl border p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                isUnlocked
                  ? "bg-slate-900/95 border-emerald-500/30 shadow-lg shadow-emerald-950/10 hover:border-emerald-500/50"
                  : "bg-slate-900/70 border-slate-800 hover:border-blue-500/40"
              }`}
            >
              {/* الجانب الأيمن: الترتيب، الأيقونة، الاسم، والوصف */}
              <div className="flex items-start gap-4 flex-1">
                {/* رقم ترتيب المادة */}
                <div
                  className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center font-bold text-sm font-mono border ${
                    isUnlocked
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-slate-950 text-slate-400 border-slate-800"
                  }`}
                >
                  {sub.order ? (sub.order < 10 ? `0${sub.order}` : sub.order) : `0${index + 1}`}
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-white hover:text-blue-400 transition-colors">
                      {sub.name}
                    </span>
                    {sub.code && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800">
                        {sub.code}
                      </span>
                    )}

                    {/* بادج التخصص أو المادة المشتركة */}
                    {sub.department && sub.department !== "GENERAL" ? (
                      (() => {
                        const subDept = DEPARTMENTS.find((d) => d.id === sub.department);
                        return subDept ? (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${subDept.tagClass}`}>
                            تخصص: {subDept.shortName}
                          </span>
                        ) : null;
                      })()
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-purple-500/10 text-purple-300 border-purple-500/20">
                        عامة مشتركة
                      </span>
                    )}

                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>مفعلة بحسابك</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                        <Lock className="w-3 h-3 text-slate-500" />
                        <span>غير مشتركة</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                    {sub.description || "شرح تفصيلي للمنهج، محاضرات فيديو، شيتات تمارين محلولة وامتحانات دورية."}
                  </p>

                  {/* إحصائيات المحتوى الداخلي */}
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-blue-400" />
                      <span>{sub._count?.lessons || 2} حصص ومحاضرات</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <FileQuestion className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{sub._count?.exams || 1} امتحانات تفاعلية</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>شيتات وملخصات PDF</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* الجانب الأيسر: السعر وزر الإجراء */}
              <div className="flex items-center md:flex-col md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800/80 flex-shrink-0">
                <div className="text-right md:text-left">
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {sub.price} ج.م
                  </div>
                  <div className="text-[10px] text-slate-400">سعر المادة الواحدة</div>
                </div>

                {isUnlocked ? (
                  <button
                    onClick={() => {
                      playCyberClick();
                      router.push(`/student/courses/${sub.id}`);
                    }}
                    onMouseEnter={playCyberHover}
                    className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30 whitespace-nowrap hover:scale-105 active:scale-95"
                  >
                    <span>الدخول للمادة والمحاضرات</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      playCyberClick();
                      setSelectedSubjectToBuy(sub);
                      setActivationMode("SINGLE");
                      setIsActivationOpen(true);
                    }}
                    onMouseEnter={playCyberHover}
                    className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30 whitespace-nowrap hover:scale-105 active:scale-95"
                  >
                    <span>شحن هذه المادة ({sub.price} ج.م)</span>
                    <Lock className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* مودال طلب تفعيل مادة واحدة (300 ج.م) أو عرض كل المواد (1200 ج.م) */}
      {isActivationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm anim-video-modal" dir="rtl">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

            <button
              onClick={() => {
                playCyberClick();
                setIsActivationOpen(false);
                setSelectedSubjectToBuy(null);
              }}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/60 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* رأس النافذة */}
            <div className="text-center mb-4">
              <div
                className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-3 shadow-lg ${
                  activationMode === "BUNDLE"
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/35 shadow-amber-500/10"
                    : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10"
                }`}
              >
                {activationMode === "BUNDLE" ? <Sparkles className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
              </div>
              <h3 className="text-lg font-bold text-white">
                {activationMode === "BUNDLE" ? "تفعيل عرض كل المواد" : "شحن وتفعيل مادة واحدة"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {activationMode === "BUNDLE"
                  ? `الباقة الكاملة لجميع مواد الترم (${termSubjects.length} مواد)`
                  : selectedSubjectToBuy?.name || "مادة واحدة"}
              </p>
            </div>

            {/* اختيار نوع الشحن: مادة واحدة (300 ج.م) أو عرض كل المواد (1200 ج.م) */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950 border border-slate-800 rounded-2xl mb-4 text-xs">
              <button
                type="button"
                onClick={() => {
                  playCyberClick();
                  setActivationMode("SINGLE");
                  if (!selectedSubjectToBuy) {
                    const fallback = termSubjects.find((s: any) => !s.isPurchased) || termSubjects[0];
                    if (fallback) setSelectedSubjectToBuy(fallback);
                  }
                }}
                className={`py-2.5 px-2 rounded-xl font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
                  activationMode === "SINGLE"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>مادة واحدة</span>
                <span className="font-mono text-[11px]">{selectedSubjectToBuy?.price || 300} ج.م</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playCyberClick();
                  setActivationMode("BUNDLE");
                }}
                className={`py-2.5 px-2 rounded-xl font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
                  activationMode === "BUNDLE"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>🔥 عرض كل المواد</span>
                <span className="font-mono text-[11px]">{BUNDLE_PRICE} ج.م</span>
              </button>
            </div>

            <div className="text-center mb-4">
              <div
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-mono font-bold text-sm border ${
                  activationMode === "BUNDLE"
                    ? "bg-amber-500/15 border-amber-500/35 text-amber-300"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                }`}
              >
                <span>المبلغ المطلوب تحويله:</span>
                <span>
                  {activationMode === "BUNDLE" ? BUNDLE_PRICE : selectedSubjectToBuy?.price || 300} ج.م
                </span>
              </div>
            </div>

            {/* تنبيه وتوضيح سياسة التفعيل */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed mb-4">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-200">
                <span>⚠️ تنبيه هـام:</span>
              </div>
              <div>
                التفعيل يتم يدوياً عن طريق <span className="font-bold text-white">م/ أحمد</span> فور تأكيد التحويل لضمان أمان حسابك.
              </div>
            </div>

            {/* بيانات التحويل (فودافون كاش / انستا باي) */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">طريقة التحويل:</span>
                <span className="font-bold text-slate-200 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>فودافون كاش / انستا باي</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">اسم المستلم المعتمد:</span>
                <span className="font-bold text-white">sobhy m</span>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400">رقم فودافون كاش / انستا باي:</div>
                  <div className="text-base font-bold font-mono text-emerald-400 tracking-wider">
                    01002051553
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText("01002051553");
                    setCopiedPhone(true);
                    playSuccessChime();
                    setTimeout(() => setCopiedPhone(false), 2500);
                  }}
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all hover:scale-105 active:scale-95"
                >
                  {copiedPhone ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>نسخ الرقم</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* زر التواصل عبر الواتساب */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  playCyberClick();
                  const studentName = data?.user?.name || "";
                  const studentPhone = data?.user?.phone || "";
                  const msg =
                    activationMode === "BUNDLE"
                      ? `السلام عليكم، تم تحويل رسوم عرض كل المواد بالكامل (${BUNDLE_PRICE} ج.م) على رقم (01002051553 - sobhy m) وأرغب في تفعيل العرض لحسابي على منصة هندسة.\nاسمي: ${studentName}\nرقم هاتفي: ${studentPhone}`
                      : `السلام عليكم، تم تحويل رسوم مادة واحدة (${selectedSubjectToBuy?.name || ""} - ${selectedSubjectToBuy?.price || 300} ج.م) على رقم (01002051553 - sobhy m) وأرغب في تفعيل المادة لحسابي على منصة هندسة.\nاسمي: ${studentName}\nرقم هاتفي: ${studentPhone}`;
                  const url = `https://wa.me/201002051553?text=${encodeURIComponent(msg)}`;
                  window.open(url, "_blank");
                }}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>
                  {activationMode === "BUNDLE"
                    ? "إرسال إيصال عرض كل المواد (1200 ج.م)"
                    : `إرسال إيصال المادة الواحدة (${selectedSubjectToBuy?.price || 300} ج.م)`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playCyberClick();
                  setIsActivationOpen(false);
                  setSelectedSubjectToBuy(null);
                }}
                className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة عرض جدول القسم الدراسي */}
      {showScheduleModal && activeDeptSchedule && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowScheduleModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full p-4 sm:p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>{activeDeptSchedule.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-white border border-slate-700 max-h-[75vh] overflow-y-auto">
              <img
                src={activeDeptSchedule.image}
                alt={activeDeptSchedule.title}
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
