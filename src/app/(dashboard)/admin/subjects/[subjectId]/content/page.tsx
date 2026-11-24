"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Video,
  FileText,
  Plus,
  Trash2,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  X,
  Play,
  UploadCloud,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Edit2,
} from "lucide-react";
import { extractYoutubeId, formatDurationArabic } from "@/lib/video-helper";
import { probeYoutubeDurationClient } from "@/lib/youtube-client";

export default function AdminSubjectContentPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { subjectId } = resolvedParams;

  const [subject, setSubject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // مودال إضافة درس
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDesc, setLessonDesc] = useState("");
  const [publishAt, setPublishAt] = useState("");

  // مودال إضافة / تعديل فيديو
  const [activeLessonForVideo, setActiveLessonForVideo] = useState<string | null>(null);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoProvider, setVideoProvider] = useState<"YOUTUBE" | "BUNNY" | "DIRECT" | "GOOGLE_DRIVE">("YOUTUBE");
  const [videoUrlOrId, setVideoUrlOrId] = useState("");
  const [videoDuration, setVideoDuration] = useState("60");
  const [detectedDurationSeconds, setDetectedDurationSeconds] = useState<number | null>(null);
  const [isDetectingDuration, setIsDetectingDuration] = useState(false);
  const [detectedVideoTitle, setDetectedVideoTitle] = useState<string | null>(null);
  const [manualDurationEdited, setManualDurationEdited] = useState(false);
  const [isPreviewFree, setIsPreviewFree] = useState(false);

  const resetVideoModal = () => {
    setActiveLessonForVideo(null);
    setEditingVideoId(null);
    setVideoTitle("");
    setVideoUrlOrId("");
    setVideoDuration("60");
    setDetectedDurationSeconds(null);
    setIsDetectingDuration(false);
    setDetectedVideoTitle(null);
    setManualDurationEdited(false);
    setIsPreviewFree(false);
  };

  const openAddVideoModal = (lessonId: string) => {
    resetVideoModal();
    setActiveLessonForVideo(lessonId);
  };

  const openEditVideoModal = (lessonId: string, vid: any) => {
    resetVideoModal();
    setActiveLessonForVideo(lessonId);
    setEditingVideoId(vid.id);
    setVideoTitle(vid.title || "");
    setVideoProvider((vid.provider as any) || "YOUTUBE");
    setVideoUrlOrId(vid.videoId || "");
    const sec = vid.durationSeconds || 3600;
    setVideoDuration(sec < 60 ? String(Number((sec / 60).toFixed(1))) : String(Math.round(sec / 60)));
    setDetectedDurationSeconds(sec);
    setIsPreviewFree(Boolean(vid.isPreviewFree));
  };

  // مودال إضافة ملف PDF
  const [activeLessonForFile, setActiveLessonForFile] = useState<string | null>(null);
  const [fileTitle, setFileTitle] = useState("");
  const [s3Key, setS3Key] = useState("");

  const fetchContent = () => {
    setLoading(true);
    fetch(`/api/student/courses/${subjectId}`)
      .then((res) => res.json())
      .then((data) => {
        setSubject(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchContent();
  }, [subjectId]);

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_LESSON",
          subjectId,
          title: lessonTitle,
          description: lessonDesc,
          publishAt: publishAt ? new Date(publishAt).toISOString() : null,
          isPublished: true,
        }),
      });

      if (res.ok) {
        setIsLessonModalOpen(false);
        setLessonTitle("");
        setLessonDesc("");
        setPublishAt("");
        fetchContent();
      }
    } catch {
      alert("حدث خطأ");
    }
  };

  // اكتشاف مدة المحاضرة تلقائياً فور لصق الرابط أو إدخال المعرّف
  useEffect(() => {
    if (!activeLessonForVideo) return;
    const raw = videoUrlOrId.trim();
    if (!raw) {
      setDetectedDurationSeconds(null);
      setDetectedVideoTitle(null);
      setIsDetectingDuration(false);
      return;
    }

    const ytId = extractYoutubeId(raw);
    const isDirectMedia = /^https?:\/\/.+\.(mp4|webm|ogg)(\?.*)?$/i.test(raw);
    const isBunnyGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);

    if (!ytId && !isDirectMedia && !isBunnyGuid) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsDetectingDuration(true);

      if (isDirectMedia) {
        try {
          const probe = document.createElement("video");
          probe.preload = "metadata";
          probe.onloadedmetadata = () => {
            if (cancelled) return;
            const sec = Math.round(probe.duration || 0);
            if (sec > 0 && Number.isFinite(sec)) {
              setDetectedDurationSeconds(sec);
              if (!manualDurationEdited) {
                setVideoDuration(sec < 60 ? String(Number((sec / 60).toFixed(1))) : String(Math.round(sec / 60)));
              }
            }
            setIsDetectingDuration(false);
          };
          probe.onerror = () => {
            if (!cancelled) setIsDetectingDuration(false);
          };
          probe.src = raw;
        } catch {
          if (!cancelled) setIsDetectingDuration(false);
        }
        return;
      }

      try {
        const res = await fetch("/api/admin/video-meta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urlOrId: raw, provider: videoProvider }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (data?.title) {
          setDetectedVideoTitle(data.title);
        }

        let resolvedSec: number | null =
          data?.durationSeconds && data.durationSeconds > 0 ? data.durationSeconds : null;

        // بديل مضمون عبر متصفح المستخدم في حال حظرت سحابة الخادم قراءة المدة من يوتيوب
        if (!resolvedSec && ytId) {
          resolvedSec = await probeYoutubeDurationClient(ytId);
        }

        if (cancelled) return;

        if (resolvedSec && resolvedSec > 0) {
          setDetectedDurationSeconds(resolvedSec);
          if (!manualDurationEdited) {
            setVideoDuration(
              resolvedSec < 60
                ? String(Number((resolvedSec / 60).toFixed(1)))
                : String(Math.round(resolvedSec / 60))
            );
          }
        }
      } catch {
        // محاولة أخيرة عبر المتصفح إذا كان رابط يوتيوب
        if (ytId && !cancelled) {
          const fallbackSec = await probeYoutubeDurationClient(ytId);
          if (!cancelled && fallbackSec && fallbackSec > 0) {
            setDetectedDurationSeconds(fallbackSec);
            if (!manualDurationEdited) {
              setVideoDuration(
                fallbackSec < 60
                  ? String(Number((fallbackSec / 60).toFixed(1)))
                  : String(Math.round(fallbackSec / 60))
              );
            }
          }
        }
      } finally {
        if (!cancelled) setIsDetectingDuration(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeLessonForVideo, videoUrlOrId, videoProvider]);

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLessonForVideo || !videoUrlOrId.trim()) return;

    const durationSecondsToSave =
      !manualDurationEdited && detectedDurationSeconds && detectedDurationSeconds > 0
        ? detectedDurationSeconds
        : Math.max(1, Math.round((parseFloat(videoDuration) || 60) * 60));

    try {
      const res = await fetch("/api/admin/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingVideoId
            ? {
                action: "UPDATE_VIDEO",
                videoRecordId: editingVideoId,
                videoData: {
                  title: videoTitle,
                  videoId: videoUrlOrId.trim(),
                  provider: videoProvider,
                  durationSeconds: durationSecondsToSave,
                  autoDetectDuration: !manualDurationEdited && !detectedDurationSeconds,
                  isPreviewFree,
                },
              }
            : {
                action: "ADD_VIDEO",
                lessonId: activeLessonForVideo,
                videoData: {
                  title: videoTitle,
                  videoId: videoUrlOrId.trim(),
                  provider: videoProvider,
                  durationSeconds: durationSecondsToSave,
                  autoDetectDuration: !manualDurationEdited && !detectedDurationSeconds,
                  isPreviewFree,
                },
              }
        ),
      });

      if (res.ok) {
        resetVideoModal();
        fetchContent();
      } else {
        const data = await res.json();
        alert(data.error || "حدث خطأ أثناء حفظ الفيديو");
      }
    } catch {
      alert("حدث خطأ في الاتصال");
    }
  };

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLessonForFile) return;
    try {
      const res = await fetch("/api/admin/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_FILE",
          lessonId: activeLessonForFile,
          fileData: {
            title: fileTitle,
            s3Key,
          },
        }),
      });

      if (res.ok) {
        setActiveLessonForFile(null);
        setFileTitle("");
        setS3Key("");
        fetchContent();
      }
    } catch {
      alert("حدث خطأ");
    }
  };

  const handleDeleteItem = async (itemType: "LESSON" | "VIDEO" | "FILE", itemId: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    try {
      const res = await fetch("/api/admin/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE_ITEM", itemType, itemId }),
      });
      if (res.ok) fetchContent();
    } catch {
      alert("فشل الحذف");
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* الترويسة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/admin/subjects")}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium mb-2"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لقائمة المواد</span>
          </button>
          <h1 className="text-2xl font-bold text-white">إدارة محتوى مادة: {subject?.name || "المادة"}</h1>
          <p className="text-xs text-slate-400 mt-1">رفع الفيديوهات وجدولة الحصص وإرفاق ملفات الـ PDF.</p>
        </div>

        <button
          onClick={() => setIsLessonModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/25 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة محاضرة / حصة جديدة</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">جاري تحميل المحتوى...</div>
      ) : subject?.lessons?.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
          <Video className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">لا توجد محاضرات في هذه المادة بعد</h3>
          <p className="text-xs text-slate-500">أضف أول محاضرة واربط بها فيديوهات Bunny Stream وملفات الشيتات.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subject?.lessons?.map((lesson: any, idx: number) => (
            <div
              key={lesson.id}
              className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    <h3 className="text-base font-bold text-white">{lesson.title}</h3>
                  </div>
                  {lesson.description && (
                    <p className="text-xs text-slate-400 mt-1 pr-8">{lesson.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => openAddVideoModal(lesson.id)}
                    className="px-3 py-1.5 bg-blue-600/15 hover:bg-blue-600 text-blue-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إرفاق فيديو</span>
                  </button>

                  <button
                    onClick={() => setActiveLessonForFile(lesson.id)}
                    className="px-3 py-1.5 bg-emerald-600/15 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إرفاق PDF</span>
                  </button>

                  <button
                    onClick={() => handleDeleteItem("LESSON", lesson.id)}
                    className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all"
                    title="حذف الحصة بالكامل"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* قائمة الفيديوهات المرفقة */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Video className="w-3.5 h-3.5 text-blue-400" />
                  <span>فيديوهات الحصة:</span>
                </div>
                {lesson.videos?.length === 0 ? (
                  <p className="text-[11px] text-slate-500 pr-5">لم يتم إرفاق أي فيديو بعد.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {lesson.videos?.map((vid: any) => (
                      <div
                        key={vid.id}
                        className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <Play className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <div>
                            <span className="font-bold text-white block">{vid.title}</span>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold ${
                                  vid.provider === "YOUTUBE"
                                    ? "bg-red-500/15 text-red-400 border border-red-500/30"
                                    : vid.provider === "GOOGLE_DRIVE"
                                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                    : vid.provider === "DIRECT"
                                    ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                                    : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                }`}
                              >
                                {vid.provider === "YOUTUBE"
                                  ? "🔴 يوتيوب"
                                  : vid.provider === "GOOGLE_DRIVE"
                                  ? "📁 درايف"
                                  : vid.provider === "DIRECT"
                                  ? "🔗 مباشر"
                                  : "🐰 Bunny"}
                              </span>
                              {vid.isPreviewFree && (
                                <span className="px-2 py-0.5 rounded-md font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  معاينة مجانية
                                </span>
                              )}
                              <span className="text-slate-400 font-mono">
                                {formatDurationArabic(vid.durationSeconds || 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditVideoModal(lesson.id, vid)}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                            title="تعديل الفيديو أو تحديث مدته"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem("VIDEO", vid.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="حذف الفيديو"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* قائمة ملفات الـ PDF المرفقة */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ملفات الـ PDF والشيتات:</span>
                </div>
                {lesson.files?.length === 0 ? (
                  <p className="text-[11px] text-slate-500 pr-5">لم يتم إرفاق شيتات بعد.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {lesson.files?.map((file: any) => (
                      <div
                        key={file.id}
                        className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <div>
                            <span className="font-bold text-white block">{file.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono truncate max-w-xs block">
                              S3: {file.s3Key}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteItem("FILE", file.id)}
                          className="p-1 text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* مودال إنشاء درس */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsLessonModalOpen(false)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-4">إضافة محاضرة / حصة جديدة</h3>

            <form onSubmit={handleCreateLesson} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">عنوان المحاضرة:</label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="مثال: المحاضرة الثالثة: تطبيقات عزم القوى"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">الوصف:</label>
                <textarea
                  rows={2}
                  value={lessonDesc}
                  onChange={(e) => setLessonDesc(e.target.value)}
                  placeholder="ملخص محتوى الحصة..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">جدولة النشر (اختياري):</label>
                <input
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  اتركها فارغة لنشر المحاضرة فوراً.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLessonModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
                >
                  إضافة الحصة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال ربط فيديو (يوتيوب مجاني، Bunny Stream، Google Drive، أو مباشر) */}
      {activeLessonForVideo && (() => {
        const detectedYtId = videoProvider === "YOUTUBE" ? extractYoutubeId(videoUrlOrId) : null;
        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
              <button
                onClick={resetVideoModal}
                className="absolute top-5 left-5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingVideoId ? "تعديل بيانات ومدة الفيديو" : "إرفاق فيديو للمحاضرة"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    بمجرد لصق الرابط يتم حساب وقت المحاضرة تلقائياً وتحديثه
                  </p>
                </div>
              </div>

              {/* أزرار اختيار المزود */}
              <div className="grid grid-cols-3 gap-2 mb-4 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setVideoProvider("YOUTUBE")}
                  className={`py-2 px-1.5 rounded-xl font-bold flex flex-col items-center gap-1 transition-all ${
                    videoProvider === "YOUTUBE"
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/25"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-1">🔴 يوتيوب</span>
                  <span className="text-[9px] opacity-90 font-medium">مجاني 100% ⭐</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVideoProvider("BUNNY")}
                  className={`py-2 px-1.5 rounded-xl font-bold flex flex-col items-center gap-1 transition-all ${
                    videoProvider === "BUNNY"
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-1">🐰 Bunny Stream</span>
                  <span className="text-[9px] opacity-75 font-normal">سيرفر مشفر</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVideoProvider("DIRECT")}
                  className={`py-2 px-1.5 rounded-xl font-bold flex flex-col items-center gap-1 transition-all ${
                    videoProvider === "DIRECT"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-1">🔗 درايف / مباشر</span>
                  <span className="text-[9px] opacity-75 font-normal">Drive أو MP4</span>
                </button>
              </div>

              <form onSubmit={handleAddVideo} className="space-y-4 text-xs">
                {/* تنبيه يوتيوب الإرشادي */}
                {videoProvider === "YOUTUBE" && (
                  <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-2xl text-slate-300 space-y-1">
                    <div className="font-bold text-red-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>نصيحة هامة لحماية فيديوهاتك مجاناً:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      ارفع الفيديو على قناتك على يوتيوب واضبط خصوصيته على <strong>&quot;غير مدرج - Unlisted&quot;</strong>. الفيديو لن يظهر في نتائج البحث على يوتيوب، وسيفتح لطلابك فقط داخل مشغل منصتك المحمي مع علامة مائية متحركة برقم هاتف واسم الطالب لمنع تصوير الشاشة.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-medium mb-1">عنوان الفيديو / المحاضرة:</label>
                  <input
                    type="text"
                    required
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="مثال: شرح الباب الأول - مقدمة وتأسيس"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                  {detectedVideoTitle && !videoTitle.trim() && (
                    <button
                      type="button"
                      onClick={() => setVideoTitle(detectedVideoTitle)}
                      className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-[11px] text-blue-300 transition-all"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>استخدام عنوان الفيديو: {detectedVideoTitle}</span>
                    </button>
                  )}
                </div>

                {videoProvider === "YOUTUBE" && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">رابط فيديو اليوتيوب أو المعرّف:</label>
                    <input
                      type="text"
                      required
                      value={videoUrlOrId}
                      onChange={(e) => setVideoUrlOrId(e.target.value)}
                      placeholder="e.g. https://youtu.be/... أو https://www.youtube.com/watch?v=..."
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-red-500"
                      dir="ltr"
                    />
                    {detectedYtId ? (
                      <div className="mt-2 space-y-2">
                        <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>معرف يوتيوب المستخرج بنجاح: {detectedYtId}</span>
                        </div>
                        <div className="relative rounded-xl overflow-hidden border border-slate-800 aspect-video bg-black max-h-36">
                          <img
                            src={`https://img.youtube.com/vi/${detectedYtId}/mqdefault.jpg`}
                            alt="معاينة الفيديو"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-[10px] text-white font-bold flex items-center gap-1">
                            <span>معاينة الغلاف</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        يمكنك نسخ ولصق رابط الفيديو من المتصفح مباشرة (سواء كان رابط عادي، رابط مختصر youtu.be، أو غير مدرج).
                      </span>
                    )}
                  </div>
                )}

                {videoProvider === "BUNNY" && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Bunny Video ID (معرّف الفيديو):</label>
                    <input
                      type="text"
                      required
                      value={videoUrlOrId}
                      onChange={(e) => setVideoUrlOrId(e.target.value)}
                      placeholder="e.g. 52c93392-xxxx-xxxx-xxxx"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-blue-500"
                      dir="ltr"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      انسخ Video ID من لوحة تحكم Bunny Stream لمكتبة الفيديوهات الخاصة بك.
                    </span>
                  </div>
                )}

                {videoProvider === "DIRECT" && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">رابط الفيديو المباشر (.mp4 أو Google Drive):</label>
                    <input
                      type="text"
                      required
                      value={videoUrlOrId}
                      onChange={(e) => setVideoUrlOrId(e.target.value)}
                      placeholder="https://.../video.mp4 أو رابط مشاركة Google Drive"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-purple-500"
                      dir="ltr"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      يدعم روابط MP4 المباشرة وروابط Google Drive العامة.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      مدة المحاضرة (بالدقائق):
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={videoDuration}
                      onChange={(e) => {
                        setManualDurationEdited(true);
                        setVideoDuration(e.target.value);
                      }}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                    {isDetectingDuration ? (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-blue-400">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>جاري حساب وقت المحاضرة تلقائياً...</span>
                      </div>
                    ) : detectedDurationSeconds && !manualDurationEdited ? (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                        <Clock className="w-3 h-3" />
                        <span>تم الضبط تلقائياً: {formatDurationArabic(detectedDurationSeconds)}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col justify-start pt-5">
                    <label className="flex items-center gap-2 p-2.5 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={isPreviewFree}
                        onChange={(e) => setIsPreviewFree(e.target.checked)}
                        className="rounded border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span className="text-[11px] text-slate-300">معاينة مجانية للكل</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={resetVideoModal}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/25"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingVideoId ? "حفظ التعديلات" : "حفظ الفيديو"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* مودال إرفاق ملف PDF */}
      {activeLessonForFile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setActiveLessonForFile(null)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-4">إرفاق شيت / ملخص PDF</h3>

            <form onSubmit={handleAddFile} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">اسم الملف:</label>
                <input
                  type="text"
                  required
                  value={fileTitle}
                  onChange={(e) => setFileTitle(e.target.value)}
                  placeholder="شيت المسائل المحلولة للمحاضرة.pdf"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">مسار التخزين في Cloudflare R2 / S3 Key:</label>
                <input
                  type="text"
                  required
                  value={s3Key}
                  onChange={(e) => setS3Key(e.target.value)}
                  placeholder="prep/mth/lecture3_sheet.pdf"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveLessonForFile(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold"
                >
                  حفظ الملف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
