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
} from "lucide-react";

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

  // مودال إضافة فيديو
  const [activeLessonForVideo, setActiveLessonForVideo] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [bunnyVideoId, setBunnyVideoId] = useState("");
  const [videoDuration, setVideoDuration] = useState("60");

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

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLessonForVideo) return;
    try {
      const res = await fetch("/api/admin/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_VIDEO",
          lessonId: activeLessonForVideo,
          videoData: {
            title: videoTitle,
            videoId: bunnyVideoId,
            durationSeconds: parseInt(videoDuration) * 60,
          },
        }),
      });

      if (res.ok) {
        setActiveLessonForVideo(null);
        setVideoTitle("");
        setBunnyVideoId("");
        fetchContent();
      }
    } catch {
      alert("حدث خطأ");
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
                    onClick={() => setActiveLessonForVideo(lesson.id)}
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
                        <div className="flex items-center gap-2">
                          <Play className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <div>
                            <span className="font-bold text-white block">{vid.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Bunny ID: {vid.videoId} • {Math.floor(vid.durationSeconds / 60)} دقيقة
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteItem("VIDEO", vid.id)}
                          className="p-1 text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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

      {/* مودال ربط فيديو Bunny */}
      {activeLessonForVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setActiveLessonForVideo(null)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-4">إرفاق فيديو من Bunny Stream</h3>

            <form onSubmit={handleAddVideo} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">عنوان الفيديو:</label>
                <input
                  type="text"
                  required
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="فيديو الشرح عالي الجودة"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Bunny Video ID (معرّف الفيديو):</label>
                <input
                  type="text"
                  required
                  value={bunnyVideoId}
                  onChange={(e) => setBunnyVideoId(e.target.value)}
                  placeholder="e.g. 52c93392-xxxx-xxxx-xxxx"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">المدة التقريبية (بالدقائق):</label>
                <input
                  type="number"
                  value={videoDuration}
                  onChange={(e) => setVideoDuration(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveLessonForVideo(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
                >
                  حفظ الفيديو
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
