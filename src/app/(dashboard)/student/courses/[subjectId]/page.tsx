"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Video,
  FileText,
  FileQuestion,
  Play,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
  RefreshCw,
} from "lucide-react";
import SecureVideoPlayer from "@/components/video/SecureVideoPlayer";
import SecurePdfViewer from "@/components/pdf/SecurePdfViewer";
import {
  playCyberHover,
  playCyberClick,
  playWhoosh,
  playTargetLock,
} from "@/lib/sound";

export default function SubjectContentPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const resolvedParams = use(params);
  const { subjectId } = resolvedParams;

  const [subject, setSubject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // التبويب النشط: فيديوهات | ملفات | امتحانات
  const [activeTab, setActiveTab] = useState<"VIDEOS" | "FILES" | "EXAMS">("VIDEOS");

  // المشغل النشط
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/student/courses/${subjectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setSubject(data);
          // اختيار أول فيديو تلقائياً للمعاينة
          const firstVideo = data.lessons?.[0]?.videos?.[0];
          if (firstVideo) setSelectedVideo(firstVideo);
          const firstFile = data.lessons?.[0]?.files?.[0];
          if (firstFile) setSelectedFile(firstFile);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("فشل تحميل محتوى المادة");
        setLoading(false);
      });
  }, [subjectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-xs text-slate-400">جاري فتح محتويات المادة المشفرة...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center" dir="rtl">
        <Lock className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">المحتوى غير متاح</h2>
        <p className="text-xs text-slate-400 mb-6">{error}</p>
        <button
          onClick={() => router.push("/student/courses")}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
        >
          العودة لقائمة المواد
        </button>
      </div>
    );
  }

  const studentName = session?.user?.name || "طالب هندسة";
  const studentPhone = (session?.user as any)?.phone || "01000000000";

  return (
    <div className="space-y-6" dir="rtl">
      {/* الترويسة والتنقل */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/student/courses")}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium mb-2"
          >
            <ArrowRight className="w-4 h-4" />
            <span>الرجوع للمواد</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <span>{subject.name}</span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {subject.code || "MTH"}
            </span>
          </h1>
        </div>

        {/* أزرار التبديل بين الأقسام الثلاثة مع صوت الانتقال Whoosh */}
        <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1 self-start sm:self-auto">
          <button
            onClick={() => {
              playWhoosh();
              setActiveTab("VIDEOS");
            }}
            onMouseEnter={playCyberHover}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "VIDEOS"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Video className="w-4 h-4" />
            <span>الفيديوهات</span>
          </button>

          <button
            onClick={() => {
              playWhoosh();
              setActiveTab("FILES");
            }}
            onMouseEnter={playCyberHover}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "FILES"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>ملفات الـ PDF</span>
          </button>

          <button
            onClick={() => {
              playWhoosh();
              setActiveTab("EXAMS");
            }}
            onMouseEnter={playCyberHover}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "EXAMS"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileQuestion className="w-4 h-4" />
            <span>الامتحانات</span>
          </button>
        </div>
      </div>

      {/* قسم 1: الفيديوهات والمحاضرات */}
      {activeTab === "VIDEOS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* مشغل الفيديو مع الوترمارك */}
          <div className="lg:col-span-2 space-y-4">
            {selectedVideo ? (
              <div>
                <SecureVideoPlayer
                  videoId={selectedVideo.id}
                  videoTitle={selectedVideo.title}
                  studentName={studentName}
                  studentPhone={studentPhone}
                />
                <div className="mt-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                  <h3 className="text-base font-bold text-white mb-1">{selectedVideo.title}</h3>
                  <p className="text-xs text-slate-400">
                    مدة المحاضرة: {Math.floor(selectedVideo.durationSeconds / 60)} دقيقة • مشغل آمن
                  </p>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center text-xs text-slate-500">
                اختر حصة من القائمة لبدء المشاهدة
              </div>
            )}
          </div>

          {/* قائمة الحصص والمحاضرات */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4 h-fit">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Video className="w-4 h-4 text-blue-400" />
              <span>فهرس المحاضرات</span>
            </h3>

            <div className="space-y-3">
              {subject.lessons?.map((lesson: any, idx: number) => (
                <div key={lesson.id} className="space-y-2">
                  <div className="text-xs font-bold text-slate-300">
                    {idx + 1}. {lesson.title}
                  </div>

                  {lesson.videos?.map((vid: any) => {
                    const isSelected = selectedVideo?.id === vid.id;
                    return (
                      <button
                        key={vid.id}
                        onClick={() => setSelectedVideo(vid)}
                        className={`w-full p-3 rounded-xl border text-right transition-all flex items-center justify-between text-xs ${
                          isSelected
                            ? "bg-blue-600 text-white font-bold border-blue-500 shadow-md shadow-blue-600/20"
                            : "bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Play className="w-3.5 h-3.5" />
                          <span className="truncate">{vid.title}</span>
                        </div>
                        <span className="text-[10px] opacity-75 font-mono">
                          {Math.floor(vid.durationSeconds / 60)} د
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* قسم 2: ملفات الـ PDF والشيتات */}
      {activeTab === "FILES" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {selectedFile ? (
              <SecurePdfViewer
                fileId={selectedFile.id}
                studentName={studentName}
                studentPhone={studentPhone}
              />
            ) : (
              <div className="h-96 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center text-xs text-slate-500">
                اختر ملخصاً أو شيتاً للمعاينة
              </div>
            )}
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4 h-fit">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>الشيتات والملخصات المتاحة</span>
            </h3>

            <div className="space-y-2.5">
              {subject.lessons?.flatMap((l: any) => l.files || []).map((file: any) => {
                const isSelected = selectedFile?.id === file.id;
                return (
                  <button
                    key={file.id}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full p-3 rounded-xl border text-right transition-all flex items-center justify-between text-xs ${
                      isSelected
                        ? "bg-emerald-600 text-white font-bold border-emerald-500 shadow-md shadow-emerald-600/20"
                        : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span className="truncate">{file.title}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* قسم 3: الامتحانات والاختبارات التفاعلية (مرتبة رأسياً تحت بعضها) */}
      {activeTab === "EXAMS" && (
        <div className="space-y-4">
          {subject.exams?.map((exam: any, idx: number) => {
            const attempt = exam.attempts?.[0];
            const isCompleted = attempt && (attempt.status === "SUBMITTED" || attempt.status === "TIMED_OUT");
            const isInProgress = attempt && attempt.status === "IN_PROGRESS";

            return (
              <div
                key={exam.id}
                className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-slate-700 transition-all"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {idx < 9 ? `0${idx + 1}` : idx + 1}
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white">{exam.title}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        محاولة واحدة فقط
                      </span>

                      {isCompleted ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          الدرجة: {attempt.score} من {exam.totalMarks}
                        </span>
                      ) : isInProgress ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                          المحاولة جارية الآن
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
                          لم تبدأ بعد
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                      {exam.description || "اختبار تفاعلي بنظام السحب العشوائي من بنك الأسئلة ومؤقت سيرفري."}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>المدة: {exam.durationMinutes} دقيقة</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1.5">
                        <FileQuestion className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{exam.questionsToSelect} أسئلة عشوائية من البنك</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* زر البدء أو الاستئناف */}
                <div className="flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                  {isCompleted ? (
                    <button
                      disabled
                      className="py-2.5 px-5 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>تم تسليم الامتحان</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        playTargetLock();
                        router.push(`/student/courses/${subject.id}/exams/${exam.id}`);
                      }}
                      onMouseEnter={playCyberHover}
                      className="py-2.5 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/25 whitespace-nowrap hover:scale-105 active:scale-95"
                    >
                      <Play className="w-4 h-4" />
                      <span>{isInProgress ? "استئناف الامتحان" : "بدء الامتحان الآن"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
