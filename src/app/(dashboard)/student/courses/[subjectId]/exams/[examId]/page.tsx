"use client";

import React, { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Send,
  ShieldAlert,
  Save,
  HelpCircle,
  Trophy,
  ArrowRight,
  Lightbulb,
  Printer,
  Sparkles,
  Check,
  X,
  Filter,
  Lock,
  ShieldCheck,
  EyeOff,
} from "lucide-react";
import {
  playCyberClick,
  playCyberHover,
  playTargetLock,
  playSuccessChime,
} from "@/lib/sound";
import LatexRenderer from "@/components/common/LatexRenderer";

export default function StudentExamPage({
  params,
}: {
  params: Promise<{ subjectId: string; examId: string }>;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const resolvedParams = use(params);
  const { subjectId, examId } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // بيانات المحاولة
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [assignedQuestions, setAssignedQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  // المؤقت السيرفري
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [serverDueTime, setServerDueTime] = useState<Date | null>(null);

  // مكافحة الغش ومنع التصوير (Anti-Cheat & Anti-Screenshot)
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [cheatWarning, setCheatWarning] = useState(false);
  const [isScreenProtected, setIsScreenProtected] = useState(false);
  const [protectionReason, setProtectionReason] = useState<string>("");
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const answersRef = useRef<Record<string, string>>({});
  answersRef.current = answers;
  const lastViolationAtRef = useRef<number>(0);
  const forcedSubmitRef = useRef<boolean>(false);

  // النتيجة النهائية
  const [isFinished, setIsFinished] = useState(false);
  const [resultData, setResultData] = useState<any | null>(null);
  const [autoSubmittedReason, setAutoSubmittedReason] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<"ALL" | "WRONG" | "CORRECT">("ALL");

  // 1. بدء أو استئناف الامتحان
  useEffect(() => {
    setLoading(true);
    fetch("/api/exams/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (data.isFinished) {
          setIsFinished(true);
          setResultData(data.review || data.attempt);
        } else {
          setAttemptId(data.attemptId);
          setAssignedQuestions(data.assignedQuestions || []);
          setAnswers(data.savedAnswers || {});
          setRemainingSeconds(data.remainingSeconds || 0);
          setTabSwitchCount(data.tabSwitchCount || 0);
          if (data.serverDueTime) setServerDueTime(new Date(data.serverDueTime));
        }
        setLoading(false);
      })
      .catch(() => {
        setError("فشل الاتصال بخادم الامتحان");
        setLoading(false);
      });
  }, [examId]);

  // جلب المراجعة التفصيلية إذا كانت المحاولة منتهية ولم يتم تحميل تفاصيل الأسئلة بعد
  useEffect(() => {
    if (isFinished && resultData && !resultData.reviewQuestions) {
      fetch(`/api/exams/review?examId=${examId}`)
        .then((res) => res.json())
        .then((rev) => {
          if (rev && !rev.error) {
            setResultData(rev);
          }
        })
        .catch(() => {});
    }
  }, [isFinished, resultData, examId]);

  // 2. إدارة المؤقت السيرفري بدقة
  useEffect(() => {
    if (!serverDueTime || isFinished) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const due = new Date(serverDueTime).getTime();
      const diff = Math.floor((due - now) / 1000);

      if (diff <= 0) {
        clearInterval(interval);
        setRemainingSeconds(0);
        // تسليم تلقائي عند انتهاء الوقت السيرفري
        handleSubmitExam(true);
      } else {
        setRemainingSeconds(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [serverDueTime, isFinished]);

  // 3. منظومة حماية الامتحان الشاملة (التسليم التلقائي الفوري عند أخذ لقطة شاشة أو الخروج من الامتحان)
  useEffect(() => {
    if (isFinished || !attemptId) return;

    const mountedAt = Date.now();

    const forceSubmitOnViolation = async (reason: string) => {
      if (forcedSubmitRef.current) return;
      forcedSubmitRef.current = true;

      playTargetLock();
      setIsScreenProtected(true);
      setProtectionReason(`${reason} — جاري تسليم الامتحان تلقائياً الآن...`);
      setCheatWarning(true);
      setTabSwitchCount((prev) => prev + 1);
      setShowSubmitConfirm(false);

      try {
        const res = await fetch("/api/exams/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            attemptId,
            answers: answersRef.current,
            violationReason: reason,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setAutoSubmittedReason(reason);
          setIsScreenProtected(false);
          setIsFinished(true);
          setResultData(data.review || data);
        }
      } catch {
        // إبقاء ستار الحماية مفعلاً في حال تعذر الشبكة
      }
    };

    const clearClipboardSafely = () => {
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          navigator.clipboard
            .writeText("غير مسموح بأخذ لقطة شاشة للامتحان - منصة هندسة التعليمية")
            .catch(() => {});
        }
      } catch {
        // تجاهل
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        forceSubmitOnViolation("تم الخروج من تبويب الامتحان أو فتح أداة خارجية");
      }
    };

    const handleWindowBlur = () => {
      // مهلة أولية قصيرة عند فتح الصفحة فقط، بعدها أي خروج أو فتح أداة تصوير يسلم الامتحان فوراً
      if (Date.now() - mountedAt < 800) return;
      forceSubmitOnViolation("تم الخروج من نافذة الامتحان أو فتح أداة تصوير خارجية");
    };

    const handlePageHide = () => {
      if (forcedSubmitRef.current) return;
      forcedSubmitRef.current = true;
      try {
        const payload = new Blob(
          [
            JSON.stringify({
              attemptId,
              answers: answersRef.current,
              violationReason: "مغادرة أو إغلاق صفحة الامتحان",
            }),
          ],
          { type: "application/json" }
        );
        navigator.sendBeacon("/api/exams/submit", payload);
      } catch {
        // تجاهل
      }
    };

    const handleKeyDownOrUp = (e: KeyboardEvent) => {
      const key = (e.key || "").toLowerCase();
      const code = e.code || "";
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // 1. زر PrintScreen في أنظمة Windows/Linux
      if (key === "printscreen" || code === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        clearClipboardSafely();
        forceSubmitOnViolation("محاولة أخذ لقطة شاشة (PrintScreen) أثناء الامتحان");
        return;
      }

      // 2. اختصار أداة القص والتسجيل (Win+Shift+S, Win+Alt+R, Win+G, Cmd+Shift+3/4/5, Ctrl+Shift+S)
      if (
        (e.metaKey && e.altKey && key === "r") ||
        (e.metaKey && key === "g") ||
        (e.metaKey && e.shiftKey && (key === "s" || key === "3" || key === "4" || key === "5")) ||
        (e.ctrlKey && e.shiftKey && key === "s")
      ) {
        e.preventDefault();
        e.stopPropagation();
        clearClipboardSafely();
        forceSubmitOnViolation("محاولة تصوير أو تسجيل شاشة الامتحان");
        return;
      }

      // 3. منع الطباعة (Ctrl+P / Cmd+P) وحفظ الصفحة (Ctrl+S) وعرض المصدر (Ctrl+U) والنسخ والقص
      if (isCtrlOrMeta && ["p", "s", "u", "c", "x", "a"].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        if (key === "p" || key === "s") {
          forceSubmitOnViolation("محاولة طباعة أو حفظ ورقة الامتحان");
        }
        return;
      }

      // 4. منع أدوات المطورين (F12, Ctrl+Shift+I/J/C)
      if (
        key === "f12" ||
        (isCtrlOrMeta && e.shiftKey && ["i", "j", "c", "k"].includes(key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        forceSubmitOnViolation("محاولة فتح أدوات الفحص أثناء الامتحان");
      }
    };

    const handleBeforePrint = (e: Event) => {
      e.preventDefault?.();
      forceSubmitOnViolation("محاولة طباعة ورقة الامتحان");
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.clipboardData?.setData("text/plain", "النسخ محظور أثناء الامتحان");
    };
    const handleCut = (e: ClipboardEvent) => e.preventDefault();
    const handlePaste = (e: ClipboardEvent) => e.preventDefault();
    const handleDragStart = (e: DragEvent) => e.preventDefault();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("keydown", handleKeyDownOrUp, true);
    window.addEventListener("keyup", handleKeyDownOrUp, true);
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("copy", handleCopy);
    window.addEventListener("cut", handleCut);
    window.addEventListener("paste", handlePaste);
    window.addEventListener("dragstart", handleDragStart);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("keydown", handleKeyDownOrUp, true);
      window.removeEventListener("keyup", handleKeyDownOrUp, true);
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("copy", handleCopy);
      window.removeEventListener("cut", handleCut);
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("dragstart", handleDragStart);
    };
  }, [attemptId, isFinished]);

  // 4. الحفظ التلقائي الدوري كل 12 ثانية
  useEffect(() => {
    if (!attemptId || isFinished) return;

    const autoSaveInterval = setInterval(() => {
      setIsAutoSaving(true);
      fetch("/api/exams/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          answers,
          tabSwitched: false,
        }),
      })
        .then(() => setIsAutoSaving(false))
        .catch(() => setIsAutoSaving(false));
    }, 12000);

    return () => clearInterval(autoSaveInterval);
  }, [attemptId, answers, isFinished]);

  // اختيار إجابة
  const handleSelectOption = (questionId: string, optionId: string) => {
    playCyberClick();
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  // تسليم الامتحان
  const handleSubmitExam = async (isForcedTimeout = false) => {
    if (!isForcedTimeout) {
      setShowSubmitConfirm(true);
      return;
    }

    await confirmAndSubmitExam();
  };

  const confirmAndSubmitExam = async () => {
    setShowSubmitConfirm(false);
    setLoading(true);
    try {
      const res = await fetch("/api/exams/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          answers,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        playSuccessChime();
        setIsFinished(true);
        setResultData(data.review || data);
      } else {
        alert(data.error || "فشل تسليم الامتحان");
      }
    } catch {
      alert("حدث خطأ أثناء التسليم");
    } finally {
      setLoading(false);
    }
  };

  // تنسيق الوقت
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading && !attemptId && !isFinished) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-center p-4">
        <Clock className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <h2 className="text-base font-bold">جاري فتح وتأمين ورقة الامتحان...</h2>
        <p className="text-xs text-slate-400 mt-1">يتم الآن توليد نسختك العشوائية الفريدة من بنك الأسئلة.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">تعذر دخول الامتحان</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">{error}</p>
          <button
            onClick={() => router.push(`/student/courses/${subjectId}`)}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
          >
            الرجوع لصفحة المادة
          </button>
        </div>
      </div>
    );
  }

  // شاشة عرض النتيجة ومراجعة تفاصيل الامتحان والإجابات النموذجية بعد انتهاء الوقت أو التسليم
  if (isFinished) {
    const score = Number(resultData?.score ?? 0);
    const totalMarks = Number(resultData?.totalMarks ?? 10);
    const percentage = resultData?.percentage ?? (totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0);
    const isPassed = resultData?.isPassed;
    const reviewQuestions = resultData?.reviewQuestions || [];
    const correctCount = resultData?.correctCount ?? reviewQuestions.filter((q: any) => q.isCorrect).length;
    const wrongCount = resultData?.wrongCount ?? reviewQuestions.filter((q: any) => q.isAnswered && !q.isCorrect).length;
    const unansweredCount = resultData?.unansweredCount ?? reviewQuestions.filter((q: any) => !q.isAnswered).length;

    const filteredQuestions = reviewQuestions.filter((q: any) => {
      if (reviewFilter === "CORRECT") return q.isCorrect;
      if (reviewFilter === "WRONG") return !q.isCorrect;
      return true;
    });

    return (
      <div className="min-h-screen bg-[#070b14] text-white p-4 sm:p-6 lg:p-8" dir="rtl">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* شريط الإجراءات والرجوع */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs font-mono text-blue-400 font-bold block mb-1">
                {resultData?.subjectName || "امتحان المادة"} · تقرير النتيجة والمراجعة
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {resultData?.examTitle || "مراجعة تفاصيل الامتحان والإجابات النموذجية"}
              </h1>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة النتيجة</span>
              </button>
              <button
                onClick={() => router.push(`/student/courses/${subjectId}`)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-blue-600/25"
              >
                <span>العودة للمادة</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* تنبيه أمني في حال تم التسليم التلقائي بسبب التصوير أو الخروج من الامتحان */}
          {autoSubmittedReason && (
            <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <div className="font-bold text-red-300 mb-0.5">تم تسليم الامتحان تلقائياً وإغلاق المحاولة</div>
                <div>السبب المسجل: {autoSubmittedReason}</div>
              </div>
            </div>
          )}

          {/* كارت النتيجة الرئيسي والتحليلات */}
          <div className="relative rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl overflow-hidden eng-cyber-card">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* الجانب الأيمن: الشارة والدرجة */}
              <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-right">
                <div
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex flex-col items-center justify-center font-mono font-black border flex-shrink-0 shadow-xl ${
                    isPassed
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-950/20"
                      : "bg-red-500/10 text-red-400 border-red-500/30 shadow-red-950/20"
                  }`}
                >
                  <span className="text-2xl sm:text-3xl">{score}</span>
                  <span className="text-[11px] text-slate-400 font-normal">من {totalMarks}</span>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
                        isPassed
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>{isPassed ? "ناجح ومجتاز بتفوق 🎉" : "تم التسليم بنجاح"}</span>
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-bold">({percentage}%)</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-1">
                    تم الانتهاء من تصحيح الامتحان آلياً على السيرفر
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                    تم إغلاق نافذة الامتحان وحساب درجاتك بدقة. تجد بالأسفل تفاصيل كل سؤال مع إجابتك، الإجابة النموذجية الصحيحة، والشرح الهندسي التفصيلي لكل مسألة.
                  </p>
                </div>
              </div>

              {/* بطاقات الإحصائيات السريعة */}
              <div className="grid grid-cols-3 gap-2.5 w-full md:w-auto">
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-emerald-500/20 text-center">
                  <div className="text-xs font-bold text-emerald-400 mb-0.5 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>صحيحة</span>
                  </div>
                  <div className="text-xl font-black font-mono text-white">{correctCount}</div>
                  <div className="text-[10px] text-slate-400">أسئلة</div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/70 border border-red-500/20 text-center">
                  <div className="text-xs font-bold text-red-400 mb-0.5 flex items-center justify-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>خاطئة</span>
                  </div>
                  <div className="text-xl font-black font-mono text-white">{wrongCount}</div>
                  <div className="text-[10px] text-slate-400">أسئلة</div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                  <div className="text-xs font-bold text-slate-400 mb-0.5 flex items-center justify-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>متروكة</span>
                  </div>
                  <div className="text-xl font-black font-mono text-white">{unansweredCount}</div>
                  <div className="text-[10px] text-slate-400">بدون إجابة</div>
                </div>
              </div>
            </div>

            {/* إشعار الواتساب وحفظ النتيجة */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>تم إرسال بطاقة درجاتك المعتمدة عبر رسالة واتساب إلى رقمك فور التسليم!</span>
              </div>
              {resultData?.tabSwitchCount > 0 && (
                <div className="text-[11px] text-amber-400 font-mono bg-amber-950/30 px-2.5 py-1 rounded-lg border border-amber-800/30 self-start sm:self-auto">
                  تنبيه نزاهة: تم تسجيل {resultData.tabSwitchCount} محاولات مغادرة للتبويب
                </div>
              )}
            </div>
          </div>

          {/* شريط الفلترة لاختيار الأسئلة */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-slate-300">مراجعة الأسئلة والإجابات النموذجية:</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
              <button
                onClick={() => setReviewFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  reviewFilter === "ALL"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                جميع الأسئلة ({reviewQuestions.length})
              </button>
              <button
                onClick={() => setReviewFilter("WRONG")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  reviewFilter === "WRONG"
                    ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                الخاطئة فقط ({wrongCount + unansweredCount})
              </button>
              <button
                onClick={() => setReviewFilter("CORRECT")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  reviewFilter === "CORRECT"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                الصحيحة فقط ({correctCount})
              </button>
            </div>
          </div>

          {/* قائمة الأسئلة المفصلة مع الإجابات الصحيحة والتوضيحات */}
          <div className="space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-3xl text-center text-xs text-slate-400">
                لا توجد أسئلة تطابق هذا الفلتر.
              </div>
            ) : (
              filteredQuestions.map((q: any) => {
                return (
                  <div
                    key={q.id}
                    className={`rounded-3xl border p-5 sm:p-6 transition-all ${
                      q.isCorrect
                        ? "bg-slate-900/80 border-emerald-500/30 shadow-lg shadow-emerald-950/5"
                        : q.isAnswered
                        ? "bg-slate-900/80 border-red-500/30 shadow-lg shadow-red-950/5"
                        : "bg-slate-900/80 border-slate-800"
                    }`}
                  >
                    {/* ترويسة السؤال: رقم السؤال، حالته، ودرجته */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold font-mono text-xs text-blue-400">
                          {q.index}
                        </span>
                        <span className="text-xs font-bold text-slate-300">
                          {q.type === "TRUE_FALSE" ? "سؤال صح / خطأ" : "سؤال اختيار من متعدد"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {q.isCorrect ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>إجابة صحيحة (+{q.points} درجة)</span>
                          </span>
                        ) : q.isAnswered ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>إجابة خاطئة (0 من {q.points})</span>
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>لم تجب عن السؤال (0 من {q.points})</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* نص السؤال */}
                    <div className="text-sm sm:text-base font-bold text-white leading-relaxed mb-4">
                      <LatexRenderer content={q.text} />
                    </div>

                    {/* صورة السؤال إن وجدت */}
                    {q.imageUrl && (
                      <div className="mb-4 rounded-2xl overflow-hidden border border-slate-800 max-w-md">
                        <img src={q.imageUrl} alt="توضيح السؤال" className="w-full object-cover" />
                      </div>
                    )}

                    {/* قائمة الخيارات مع تمييز الإجابة الصحيحة وإجابة الطالب */}
                    <div className="space-y-2 mb-4">
                      {q.options?.map((opt: any) => {
                        const isStudentChoice = opt.isSelected;
                        const isCorrectOption = opt.isCorrectOption;

                        let cardStyle = "bg-slate-950/40 border-slate-800/80 text-slate-400";
                        let badge = null;

                        if (isCorrectOption) {
                          cardStyle = "bg-emerald-950/30 border-emerald-500/50 text-emerald-200 font-semibold";
                          badge = (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>الإجابة الصحيحة النموذجية</span>
                            </span>
                          );
                        } else if (isStudentChoice && !isCorrectOption) {
                          cardStyle = "bg-red-950/30 border-red-500/50 text-red-200 font-semibold";
                          badge = (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                              <X className="w-3 h-3 text-red-400" />
                              <span>إجابتك المختارة (غير صحيحة)</span>
                            </span>
                          );
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs sm:text-sm ${cardStyle}`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-bold text-xs border flex-shrink-0 ${
                                  isCorrectOption
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                    : isStudentChoice
                                    ? "bg-red-500/20 text-red-300 border-red-500/40"
                                    : "bg-slate-900 text-slate-500 border-slate-800"
                                }`}
                              >
                                {opt.id}
                              </div>
                              <span><LatexRenderer content={opt.text} /></span>
                            </div>

                            {badge}
                          </div>
                        );
                      })}
                    </div>

                    {/* صندوق الشرح والتوضيح الهندسي */}
                    {q.explanation && (
                      <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 text-xs text-slate-300 space-y-1.5">
                        <div className="flex items-center gap-2 text-blue-400 font-bold">
                          <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span>الشرح والتوضيح الهندسي للحل:</span>
                        </div>
                        <div className="leading-relaxed text-slate-300 pr-6">
                          <LatexRenderer content={q.explanation} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* زر الرجوع في الأسفل */}
          <div className="pt-4 pb-8 flex items-center justify-center">
            <button
              onClick={() => router.push(`/student/courses/${subjectId}`)}
              className="py-3 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-xl shadow-blue-600/30 hover:scale-105 active:scale-95"
            >
              <span>العودة لصفحة المحاضرات والمادة</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = assignedQuestions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const studentName = session?.user?.name || "طالب هندسة";
  const studentPhone = (session?.user as any)?.phone || "01000000000";

  return (
    <div
      style={{
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
      }}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      className="min-h-screen bg-[#070b14] text-white flex flex-col justify-between select-none no-select relative"
      dir="rtl"
    >
      {/* حجب الطباعة والحفظ بصيغة PDF أثناء الامتحان */}
      <style>{`
        @media print {
          body * {
            display: none !important;
            visibility: hidden !important;
          }
          body::after {
            content: "غير مسموح بطباعة أو تصوير ورقة الامتحان - منصة هندسة التعليمية";
            display: block !important;
            visibility: visible !important;
            color: #000;
            font-size: 20px;
            text-align: center;
            padding: 60px 20px;
          }
        }
      `}</style>

      {/* ستار الحماية الفوري عند محاولة التصوير أو الخروج (يتم التسليم التلقائي) */}
      {isScreenProtected && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-lg font-bold text-white">جاري تسليم الامتحان تلقائياً</h2>
            <p className="text-xs text-red-300 leading-relaxed bg-red-950/40 border border-red-500/20 rounded-2xl p-3">
              {protectionReason || "تم رصد محاولة تصوير أو مغادرة الامتحان — يتم الآن تسليم إجاباتك وإغلاق المحاولة."}
            </p>
          </div>
        </div>
      )}

      {/* مودال تأكيد تسليم الامتحان داخل الصفحة (لمنع تفعيل حماية فقدان التركيز) */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">تأكيد تسليم الامتحان</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              قمت بالإجابة عن <span className="font-bold text-emerald-400">{answeredCount}</span> من أصل{" "}
              <span className="font-bold text-white">{assignedQuestions.length}</span> سؤال. هل أنت متأكد من التسليم الآن؟
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                العودة للمراجعة
              </button>
              <button
                type="button"
                onClick={confirmAndSubmitExam}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
              >
                نعم، تسليم الآن
              </button>
            </div>
          </div>
        </div>
      )}
      {/* الشريط العلوي للامتحان: المؤقت السيرفري + حالة الحفظ ومكافحة الغش */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-slate-300 hidden sm:block">
            امتحان مادة الهندسة
          </div>
          <div className="text-[11px] text-slate-400">
            السؤال <span className="text-blue-400 font-bold">{currentIndex + 1}</span> من{" "}
            {assignedQuestions.length}
          </div>
        </div>

        {/* المؤقت السيرفري العكسي */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm font-bold border transition-all ${
            remainingSeconds <= 300
              ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
              : "bg-slate-950 text-white border-slate-800"
          }`}
        >
          <Clock className="w-4 h-4 text-blue-400" />
          <span dir="ltr">{formatTime(remainingSeconds)}</span>
        </div>

        {/* مؤشر الحفظ التلقائي وزر التسليم */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
            <Save className={`w-3.5 h-3.5 ${isAutoSaving ? "text-amber-400 animate-spin" : "text-emerald-400"}`} />
            <span>{isAutoSaving ? "جاري الحفظ..." : "محفوظ تلقائياً"}</span>
          </div>

          <button
            onClick={() => handleSubmitExam(false)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-900/30"
          >
            <Send className="w-3.5 h-3.5" />
            <span>تسليم الامتحان</span>
          </button>
        </div>
      </header>

      {/* تحذير مكافحة الغش عند الخروج من التبويب */}
      {cheatWarning && (
        <div className="bg-red-950 border-b border-red-500/40 px-4 py-2 text-xs text-red-200 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>
              ⚠️ تنبيه أمني: تم رصد مغادرة نافذة الامتحان (العدد: {tabSwitchCount})! هذه الواقعة مسجلة في تقرير المدرس.
            </span>
          </div>
          <button
            onClick={() => setCheatWarning(false)}
            className="text-[10px] underline text-red-300 font-bold"
          >
            فهمت، متابعة الحل
          </button>
        </div>
      )}

      {/* منطقة ورقة الأسئلة (مع التعتيم التلقائي وشبكة العلامات المائية لحماية الأسئلة) */}
      <main
        className={`flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 my-auto transition-all duration-150 ${
          isScreenProtected ? "opacity-0 blur-2xl pointer-events-none" : ""
        }`}
      >
        {currentQuestion && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            {/* شبكة العلامات المائية المائلة عبر كامل ورقة الامتحان بهوية الطالب */}
            <div className="absolute inset-0 pointer-events-none z-20 flex flex-wrap items-center justify-around gap-8 opacity-[0.12] p-6 overflow-hidden select-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="transform -rotate-12 text-xs sm:text-sm font-bold font-mono text-slate-200 select-none text-center"
                >
                  <div>{studentName}</div>
                  <div dir="ltr">{studentPhone}</div>
                </div>
              ))}
            </div>

            {/* شريط تنبيه الحماية العلوي المصغر */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800 relative z-10">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-bold">
                  السؤال {currentIndex + 1}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/20 text-[10px] font-semibold">
                  <Lock className="w-3 h-3" />
                  <span>محمي ضد التصوير</span>
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                الدرجة: {currentQuestion.points}
              </span>
            </div>

            {/* نص السؤال */}
            <div className="text-base sm:text-lg font-bold text-white leading-relaxed mb-6 relative z-10">
              <LatexRenderer content={currentQuestion.text} />
            </div>

            {/* صورة السؤال إن وجدت */}
            {currentQuestion.imageUrl && (
              <div className="mb-6 rounded-2xl overflow-hidden border border-slate-800 max-h-80 flex items-center justify-center bg-black/40 relative z-10">
                <img
                  src={currentQuestion.imageUrl}
                  alt="صورة السؤال"
                  draggable={false}
                  className="max-h-80 object-contain pointer-events-none select-none"
                />
              </div>
            )}

            {/* قائمة الخيارات (موزعة ومخلوطة عشوائياً للطالب) */}
            <div className="space-y-3">
              {currentQuestion.options?.map((opt: any) => {
                const isSelected = answers[currentQuestion.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                    className={`w-full p-4 rounded-2xl border text-right transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10"
                        : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold font-mono ${
                          isSelected ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {opt.id}
                      </span>
                      <span className="text-sm font-medium"><LatexRenderer content={opt.text} /></span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? "border-blue-500 bg-blue-500 text-white" : "border-slate-700"
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* الشريط السفلي: أزرار التنقل السريع بين الأسئلة */}
      <footer className="bg-slate-900/90 border-t border-slate-800 p-4 sticky bottom-0 z-40 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* شبكة أرقام الأسئلة المصغرة */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            {assignedQuestions.map((q, idx) => {
              const isAnswered = !!answers[q.id];
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold font-mono transition-all flex-shrink-0 flex items-center justify-center ${
                    isCurrent
                      ? "ring-2 ring-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                      : isAnswered
                      ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* أزرار التالي والسابق */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex-1 sm:flex-initial py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            <button
              onClick={() =>
                setCurrentIndex((prev) => Math.min(assignedQuestions.length - 1, prev + 1))
              }
              disabled={currentIndex === assignedQuestions.length - 1}
              className="flex-1 sm:flex-initial py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
