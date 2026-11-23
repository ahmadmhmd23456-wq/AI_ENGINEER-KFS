"use client";

import React, { useState, useEffect } from "react";
import { FileText, Shield, AlertCircle, RefreshCw, Lock, Eye } from "lucide-react";

interface SecurePdfViewerProps {
  fileId: string;
  studentName: string;
  studentPhone: string;
}

export default function SecurePdfViewer({ fileId, studentName, studentPhone }: SecurePdfViewerProps) {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/media/sign-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setPresignedUrl(data.presignedUrl);
          setTitle(data.title);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("تعذر تحميل الملف المشفر");
        setLoading(false);
      });
  }, [fileId]);

  // منع محاولات الطباعة وحفظ الصفحة وكليك يمين
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "s")) {
        e.preventDefault();
        alert("تنبيه: محتوى الملخص محمي بحقوق النشر ومخصص للمعاينة فقط داخل المنصة.");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="w-full h-96 bg-slate-950 rounded-2xl flex flex-col items-center justify-center border border-slate-800">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-xs text-slate-400">جاري إعداد عارض الـ PDF المشفر...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-96 bg-slate-950 rounded-2xl flex flex-col items-center justify-center border border-red-500/30 p-6 text-center">
        <Lock className="w-10 h-10 text-red-500 mb-3" />
        <h4 className="text-sm font-bold text-white mb-1">الملف مقفول</h4>
        <p className="text-xs text-slate-400 max-w-sm mb-4">{error}</p>
        <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[11px]">
          متاح فقط للطلاب المشتركين في المادة
        </span>
      </div>
    );
  }

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full h-[700px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col select-none"
    >
      {/* شريط الأدوات العلوي المخصص */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-white truncate max-w-md">{title}</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2.5 py-1 rounded-full">
          <Eye className="w-3.5 h-3.5" />
          <span>عارض آمن للقراءة فقط (غير قابل للتحميل)</span>
        </div>
      </div>

      {/* منطقة عرض الملف مع شبكة العلامات المائية المتكررة */}
      <div className="relative flex-1 w-full h-full bg-slate-950 overflow-hidden">
        {/* شبكة الوترمارك المائلة الشفافة لحماية الأوراق من التصوير */}
        <div className="absolute inset-0 pointer-events-none z-30 flex flex-wrap items-center justify-around opacity-20 p-6 overflow-hidden">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="transform -rotate-45 text-sm font-bold font-mono text-slate-300 p-8 select-none"
            >
              <div>{studentName}</div>
              <div dir="ltr">{studentPhone}</div>
            </div>
          ))}
        </div>

        {/* عرض المستند عبر Embed مقيد */}
        {presignedUrl && (
          <iframe
            src={`${presignedUrl}#toolbar=0&navpanes=0&scrollbar=1`}
            className="w-full h-full border-0 pointer-events-auto"
            title={title}
          />
        )}
      </div>
    </div>
  );
}
