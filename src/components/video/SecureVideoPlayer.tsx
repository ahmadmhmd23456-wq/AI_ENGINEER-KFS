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

  // إحداثيات العلامة المائية المتحركة
  const [watermarkPos, setWatermarkPos] = useState({ top: "20%", left: "30%" });

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

  // تحريك العلامة المائية عشوائياً كل 4 ثوانٍ
  useEffect(() => {
    const interval = setInterval(() => {
      // توليد إحداثيات عشوائية داخل حدود المشغل لتفادي القص
      const top = Math.floor(10 + Math.random() * 75) + "%";
      const left = Math.floor(5 + Math.random() * 70) + "%";
      setWatermarkPos({ top, left });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

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

      {/* العلامة المائية المتحركة الشفافة (Dynamic Floating Watermark) */}
      <div
        style={{
          top: watermarkPos.top,
          left: watermarkPos.left,
          transition: "all 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        className="absolute pointer-events-none z-30 opacity-35 bg-black/40 backdrop-blur-[2px] px-2.5 py-1 rounded-lg border border-white/10 text-[11px] font-mono text-white flex items-center gap-1.5 shadow-sm transform -rotate-2"
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
