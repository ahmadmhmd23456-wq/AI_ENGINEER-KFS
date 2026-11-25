"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Play, Pause, Volume2, Shield, AlertCircle, RefreshCw, ShieldAlert, Lock, EyeOff } from "lucide-react";

interface SecureVideoPlayerProps {
  videoId: string;
  videoTitle: string;
  studentName: string;
  studentPhone: string;
}

export default function SecureVideoPlayer({
  videoId,
  videoTitle,
  studentName,
  studentPhone,
}: SecureVideoPlayerProps) {
  const router = useRouter();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastPosition, setLastPosition] = useState(0);

  // حماية الفيديو من التصوير والتسجيل
  const [isPrivacyShielded, setIsPrivacyShielded] = useState(false);
  const [banningState, setBanningState] = useState<{ active: boolean; reason: string; adminNotice?: boolean }>({
    active: false,
    reason: "",
  });
  const banTriggeredRef = useRef(false);

  // مراجع المشغل والعلامة المائية للحركة الانسيابية
  const containerRef = useRef<HTMLDivElement | null>(null);
  const watermarkRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // جلب الرابط الموقّع ومكان التوقف
  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch("/api/media/sign-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error === "ACCOUNT_LOCKED" || (data.error && data.error.includes("حظر"))) {
          router.replace("/locked");
          return;
        }
        if (data.error) {
          setError(data.error);
        } else {
          setSignedUrl(data.signedUrl);
          setLastPosition(data.lastPositionSeconds || 0);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("فشل الاتصال بخادم الفيديو");
        setLoading(false);
      });
  }, [videoId, router]);

  // منظومة منع تسجيل الشاشة ولقطات الشاشة والحظر الفوري للمخالفين
  useEffect(() => {
    if (loading || error) return;

    const triggerCaptureBan = async (reason: string) => {
      if (banTriggeredRef.current) return;
      banTriggeredRef.current = true;

      try {
        videoRef.current?.pause();
      } catch {
        // تجاهل
      }
      setSignedUrl(null);
      setBanningState({ active: true, reason });

      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          navigator.clipboard
            .writeText("تم حظر الحساب لمحاولة تصوير أو تسجيل المحاضرة - منصة هندسة")
            .catch(() => {});
        }
      } catch {
        // تجاهل
      }

      try {
        const res = await fetch("/api/security/capture-ban", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason, videoId, videoTitle }),
        });
        const data = await res.json();
        if (data?.banned) {
          await signOut({ redirect: false });
          router.replace("/locked");
        } else if (data?.isAdminTest) {
          setBanningState({
            active: true,
            adminNotice: true,
            reason: `وضع اختبار الأدمن: تم رصد (${reason}) — لو كان طالباً لتم حظر حسابه فوراً.`,
          });
        }
      } catch {
        // في حال تعذر الشبكة تبقى الشاشة محجوبة
      }
    };

    const handleKeyGuard = (e: KeyboardEvent) => {
      const key = (e.key || "").toLowerCase();
      const code = e.code || "";
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // 1. زر PrintScreen
      if (key === "printscreen" || code === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        triggerCaptureBan("محاولة أخذ لقطة شاشة (PrintScreen) للمحاضرة");
        return;
      }

      // 2. اختصارات تسجيل الشاشة والقص (Win+Alt+R, Win+G, Win+Shift+S, Cmd+Shift+3/4/5, Ctrl+Shift+S)
      if (
        (e.metaKey && e.altKey && key === "r") ||
        (e.metaKey && key === "g") ||
        (e.metaKey && e.shiftKey && ["s", "3", "4", "5"].includes(key)) ||
        (e.ctrlKey && e.shiftKey && key === "s")
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerCaptureBan("محاولة تسجيل شاشة أو استخدام أداة قص الشاشة للمحاضرة");
        return;
      }

      // 3. اختصارات التحميل والطباعة وفحص المصدر
      if (isCtrlOrMeta && ["s", "p", "u"].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerCaptureBan("محاولة حفظ أو طباعة أو سحب رابط المحاضرة");
        return;
      }

      // 4. أدوات المطورين (F12 / Ctrl+Shift+I/J/C)
      if (key === "f12" || (isCtrlOrMeta && e.shiftKey && ["i", "j", "c", "k"].includes(key))) {
        e.preventDefault();
        e.stopPropagation();
        triggerCaptureBan("محاولة فتح أدوات المطورين لسحب فيديو المحاضرة");
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        try {
          videoRef.current?.pause();
        } catch {
          // تجاهل
        }
        setIsPrivacyShielded(true);
      }
    };

    const handleWindowBlur = () => {
      // السماح بالنقر داخل إطار الفيديو نفسه، والتعتيم فقط عند الخروج لتطبيق أو أداة خارجية
      setTimeout(() => {
        if (document.activeElement !== iframeRef.current) {
          try {
            videoRef.current?.pause();
          } catch {
            // تجاهل
          }
          setIsPrivacyShielded(true);
        }
      }, 0);
    };

    const handleBeforePrint = (e: Event) => {
      e.preventDefault?.();
      triggerCaptureBan("محاولة طباعة أو تسجيل صفحة المحاضرة");
    };

    window.addEventListener("keydown", handleKeyGuard, true);
    window.addEventListener("keyup", handleKeyGuard, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("beforeprint", handleBeforePrint);

    return () => {
      window.removeEventListener("keydown", handleKeyGuard, true);
      window.removeEventListener("keyup", handleKeyGuard, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("beforeprint", handleBeforePrint);
    };
  }, [loading, error, videoId, videoTitle, router]);

  // تحريك العلامة المائية بانسيابية وهدوء مستمر داخل المشغل بدون قفزات
  useEffect(() => {
    if (loading || error) return;
    const container = containerRef.current;
    const wm = watermarkRef.current;
    if (!container || !wm) return;

    let rafId = 0;
    let x = 24;
    let y = 24;
    // سرعة هادئة وناعمة (بكسل/ثانية) لتنزلق العلامة براحة دون إزعاج الطالب
    let vx = 18;
    let vy = 12;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      const padding = 12;
      const maxX = Math.max(padding, container.clientWidth - wm.offsetWidth - padding);
      const maxY = Math.max(padding, container.clientHeight - wm.offsetHeight - padding - 36);

      x += vx * dt;
      y += vy * dt;

      if (x <= padding) {
        x = padding;
        vx = Math.abs(vx);
      } else if (x >= maxX) {
        x = maxX;
        vx = -Math.abs(vx);
      }

      if (y <= padding) {
        y = padding;
        vy = Math.abs(vy);
      } else if (y >= maxY) {
        y = maxY;
        vy = -Math.abs(vy);
      }

      wm.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(-2deg)`;
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [loading, error]);

  // منع كليك يمين والاختصارات
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  if (loading) {
    return (
      <div className="w-full aspect-video bg-slate-950 rounded-2xl flex flex-col items-center justify-center border border-slate-800">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-xs text-slate-400">جاري فحص الصلاحية وتجهيز الرابط المشفر...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full aspect-video bg-slate-950 rounded-2xl flex flex-col items-center justify-center border border-red-500/30 p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
        <h4 className="text-sm font-bold text-white mb-1">تعذر تشغيل الفيديو</h4>
        <p className="text-xs text-slate-400 max-w-sm mb-4">{error}</p>
        <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[11px]">
          محتوى محمي بحقوق المدرس
        </span>
      </div>
    );
  }

  if (banningState.active) {
    return (
      <div className="w-full aspect-video bg-slate-950 rounded-2xl flex flex-col items-center justify-center border border-red-500/40 p-6 text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-red-500 animate-pulse" />
        <h4 className="text-base font-bold text-white">
          {banningState.adminNotice ? "تنبيه حماية التصوير (وضع الأدمن)" : "تم إيقاف وحظر الحساب فوراً"}
        </h4>
        <p className="text-xs text-red-300 max-w-md leading-relaxed">{banningState.reason}</p>
        {banningState.adminNotice && (
          <button
            type="button"
            onClick={() => {
              banTriggeredRef.current = false;
              setBanningState({ active: false, reason: "" });
              window.location.reload();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
          >
            إعادة تحميل المشغل
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onContextMenu={handleContextMenu}
      style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 select-none group"
    >
      {/* حجب الطباعة أثناء مشاهدة المحاضرة */}
      <style>{`
        @media print {
          body * { display: none !important; visibility: hidden !important; }
        }
      `}</style>

      {/* ستار الإخفاء الفوري عند مغادرة النافذة أو فتح برنامج تسجيل خارجي */}
      {isPrivacyShielded && (
        <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center space-y-3">
          <EyeOff className="w-10 h-10 text-amber-400" />
          <h4 className="text-sm font-bold text-white">تم إخفاء الفيديو لحماية المحاضرة</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            يرجى البقاء داخل صفحة المحاضرة أثناء المشاهدة. أي محاولة للتصوير أو تسجيل الشاشة تؤدي لحظر الحساب فوراً.
          </p>
          <button
            type="button"
            onClick={() => setIsPrivacyShielded(false)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
          >
            استئناف المشاهدة
          </button>
        </div>
      )}

      {/* مشغل الفيديو الآمن (يدعم يوتيوب، Bunny Stream، Google Drive، أو روابط مباشرة) */}
      {signedUrl && (
        signedUrl.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ? (
          <video
            ref={videoRef}
            src={signedUrl}
            controls
            controlsList="nodownload"
            disablePictureInPicture
            className={`w-full h-full object-contain absolute inset-0 pointer-events-auto ${
              isPrivacyShielded ? "opacity-0" : ""
            }`}
            autoPlay
          />
        ) : (
          <iframe
            ref={iframeRef}
            src={signedUrl}
            loading="lazy"
            className={`w-full h-full border-0 absolute inset-0 pointer-events-auto ${
              isPrivacyShielded ? "opacity-0" : ""
            }`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen={true}
            title={videoTitle}
          />
        )
      )}

      {/* العلامة المائية المتحركة الشفافة (Smooth Gliding Watermark) */}
      <div
        ref={watermarkRef}
        style={{
          left: 0,
          top: 0,
          transform: "translate3d(24px, 24px, 0) rotate(-2deg)",
        }}
        className="absolute pointer-events-none z-30 opacity-35 bg-black/40 backdrop-blur-[2px] px-2.5 py-1 rounded-lg border border-white/10 text-[11px] font-mono text-white flex items-center gap-1.5 shadow-sm will-change-transform"
      >
        <Shield className="w-3 h-3 text-blue-400" />
        <span className="font-bold">{studentName}</span>
        <span>•</span>
        <span dir="ltr">{studentPhone}</span>
      </div>

      {/* حماية الطبقة العلوية لمنع برامج سحب الروابط وتنزيل المتصفح */}
      <div className="absolute inset-0 pointer-events-none border-4 border-transparent hover:border-blue-500/10 rounded-2xl transition-all" />
    </div>
  );
}
