"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, Shield, AlertCircle, RefreshCw } from "lucide-react";

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
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastPosition, setLastPosition] = useState(0);

  // مراجع المشغل والعلامة المائية للحركة الانسيابية
  const containerRef = useRef<HTMLDivElement | null>(null);
  const watermarkRef = useRef<HTMLDivElement | null>(null);

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
  }, [videoId]);

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

  return (
    <div
      ref={containerRef}
      onContextMenu={handleContextMenu}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 select-none group"
    >
      {/* مشغل الفيديو الآمن (يدعم يوتيوب، Bunny Stream، Google Drive، أو روابط مباشرة) */}
      {signedUrl && (
        signedUrl.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ? (
          <video
            src={signedUrl}
            controls
            controlsList="nodownload"
            className="w-full h-full object-contain absolute inset-0 pointer-events-auto"
            autoPlay
          />
        ) : (
          <iframe
            src={signedUrl}
            loading="lazy"
            className="w-full h-full border-0 absolute inset-0 pointer-events-auto"
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
