"use client";

import React, { useState, useEffect } from "react";
import {
  FileQuestion,
  Plus,
  Clock,
  Trophy,
  CheckCircle2,
  Users,
  ShieldAlert,
  Search,
  BookOpen,
  Calendar,
  X,
  UploadCloud,
  FileSpreadsheet,
} from "lucide-react";

export default function AdminExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"EXAMS" | "BANK">("EXAMS");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("");

  // مودال إنشاء امتحان
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [examForm, setExamForm] = useState({
    subjectId: "",
    title: "",
    description: "",
    durationMinutes: "20",
    totalMarks: "10",
    passMarks: "5",
    questionsToSelect: "5",
    windowStartTime: new Date().toISOString().slice(0, 16),
    windowEndTime: new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 16),
  });

  // مودال إضافة سؤال
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionForm, setQuestionForm] = useState({
    subjectId: "",
    text: "",
    optA: "",
    optB: "",
    optC: "",
    optD: "",
    correctAnswer: "A",
    points: "2",
    explanation: "",
  });

  // مودال تقرير الامتحان
  const [selectedExamReport, setSelectedExamReport] = useState<any | null>(null);

  const fetchExamsData = () => {
    setLoading(true);
    let url = "/api/admin/exams";
    if (selectedSubjectFilter) url += `?subjectId=${selectedSubjectFilter}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setExams(data.exams || []);
        setSubjects(data.subjects || []);
        setQuestions(data.questions || []);
        if (data.subjects?.length > 0 && !examForm.subjectId) {
          setExamForm((prev) => ({ ...prev, subjectId: data.subjects[0].id }));
          setQuestionForm((prev) => ({ ...prev, subjectId: data.subjects[0].id }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchExamsData();
  }, [selectedSubjectFilter]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(examForm),
      });

      if (res.ok) {
        setIsExamModalOpen(false);
        fetchExamsData();
      } else {
        const err = await res.json();
        alert(err.error || "فشل إنشاء الامتحان");
      }
    } catch {
      alert("حدث خطأ بالاتصال");
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const options = [
        { id: "A", text: questionForm.optA },
        { id: "B", text: questionForm.optB },
        { id: "C", text: questionForm.optC },
        { id: "D", text: questionForm.optD },
      ];

      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: questionForm.subjectId,
          text: questionForm.text,
          type: "MCQ",
          options,
          correctAnswer: questionForm.correctAnswer,
          points: questionForm.points,
          explanation: questionForm.explanation,
        }),
      });

      if (res.ok) {
        setIsQuestionModalOpen(false);
        fetchExamsData();
      } else {
        alert("فشل إضافة السؤال");
      }
    } catch {
      alert("حدث خطأ");
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* الترويسة والأزرار */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">الامتحانات وبنك الأسئلة</h1>
          <p className="text-xs text-slate-400 mt-1">
            إعداد الامتحانات العشوائية، ضبط نوافذ الوقت، مراقبة الغش، ومتابعة الدرجات.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQuestionModalOpen(true)}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>إضافة سؤال للبنك</span>
          </button>

          <button
            onClick={() => setIsExamModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/25"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء امتحان جديد</span>
          </button>
        </div>
      </div>

      {/* التبويبات والفلاتر */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("EXAMS")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "EXAMS"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            الامتحانات والتقارير ({exams.length})
          </button>

          <button
            onClick={() => setActiveTab("BANK")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "BANK"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            بنك الأسئلة ({questions.length})
          </button>
        </div>

        <select
          value={selectedSubjectFilter}
          onChange={(e) => setSelectedSubjectFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 w-full sm:w-64"
        >
          <option value="">جميع المواد</option>
          {subjects.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
            </option>
          ))}
        </select>
      </div>

      {/* قسم 1: بطاقات الامتحانات (مرتبة رأسياً تحت بعضها) */}
      {activeTab === "EXAMS" && (
        <div className="space-y-4">
          {exams.map((exam, idx) => {
            const attemptsCount = exam.attempts?.length || 0;
            const scores = exam.attempts?.map((a: any) => Number(a.score)) || [];
            const avgScore = scores.length > 0 ? (scores.reduce((a: any, b: any) => a + b, 0) / scores.length).toFixed(1) : 0;
            const highestScore = scores.length > 0 ? Math.max(...scores) : 0;

            return (
              <div
                key={exam.id}
                className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:border-slate-700 transition-all"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-11 h-11 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 font-mono font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {idx < 9 ? `0${idx + 1}` : idx + 1}
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white">{exam.title}</h3>
                      <span className="text-[11px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                        {exam.subject?.name}
                      </span>
                      <span className="text-xs font-bold text-emerald-400 font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20">
                        {exam.totalMarks} درجات
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                      {exam.description || "امتحان عشوائي بمحاولة واحدة ونافذة دخول محددة ومؤقت سيرفري."}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>المدة: {exam.durationMinutes} دقيقة</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <FileQuestion className="w-3.5 h-3.5 text-indigo-400" />
                        <span>سحب {exam.questionsToSelect} أسئلة عشوائية</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span>حتى: {new Date(exam.windowEndTime).toLocaleDateString("ar-EG")}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* إحصائيات الامتحان وزر التقرير */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/80 flex-shrink-0">
                  <div className="flex items-center justify-around sm:justify-start gap-4 bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800 text-center text-xs">
                    <div>
                      <span className="font-bold font-mono text-white block">{attemptsCount}</span>
                      <span className="text-[10px] text-slate-400">ممتحن</span>
                    </div>
                    <div className="h-6 w-px bg-slate-800"></div>
                    <div>
                      <span className="font-bold font-mono text-emerald-400 block">{highestScore}</span>
                      <span className="text-[10px] text-slate-400">أعلى درجة</span>
                    </div>
                    <div className="h-6 w-px bg-slate-800"></div>
                    <div>
                      <span className="font-bold font-mono text-blue-400 block">{avgScore}</span>
                      <span className="text-[10px] text-slate-400">المتوسط</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedExamReport(exam)}
                    className="py-2.5 px-5 bg-blue-600/15 hover:bg-blue-600 text-blue-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>تقرير النتائج ومراقبة الغش</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* قسم 2: بنك الأسئلة */}
      {activeTab === "BANK" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-400 font-bold">سؤال #{idx + 1} ({q.subject?.name})</span>
                  <span className="font-mono text-slate-400">الدرجة: {q.points}</span>
                </div>

                <p className="text-sm font-bold text-white leading-relaxed">{q.text}</p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(q.options as any[])?.map((opt: any) => {
                    const isCorrect = opt.id === q.correctAnswer;
                    return (
                      <div
                        key={opt.id}
                        className={`p-2 rounded-xl border flex items-center gap-2 ${
                          isCorrect
                            ? "bg-emerald-600/15 border-emerald-500/40 text-emerald-300 font-bold"
                            : "bg-slate-950/60 border-slate-800 text-slate-400"
                        }`}
                      >
                        <span className="font-mono font-bold">{opt.id}.</span>
                        <span>{opt.text}</span>
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className="p-2.5 bg-blue-950/30 border border-blue-800/30 rounded-xl text-[11px] text-blue-300">
                    💡 التفسير: {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* مودال تقرير نتائج الطلاب ومكافحة الغش */}
      {selectedExamReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setSelectedExamReport(null)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-base font-bold text-white">{selectedExamReport.title}</h3>
              <p className="text-xs text-slate-400">
                تقرير أداء الطلاب ومعدل مغادرة التبويب (Anti-cheat tab switching).
              </p>
            </div>

            <div className="overflow-y-auto flex-1">
              {selectedExamReport.attempts?.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">لا توجد محاولات مكتملة بعد.</div>
              ) : (
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">الطالب</th>
                      <th className="py-2.5 px-3">الدرجة</th>
                      <th className="py-2.5 px-3">مرات تبديل التبويب (Tab switch)</th>
                      <th className="py-2.5 px-3">الحالة</th>
                      <th className="py-2.5 px-3">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {selectedExamReport.attempts?.map((a: any) => (
                      <tr key={a.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-bold text-white">
                          {a.user?.name}
                          <span className="block text-[10px] text-slate-400 font-mono" dir="ltr">
                            {a.user?.phone}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-400 text-sm">
                          {a.score} / {selectedExamReport.totalMarks}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              a.tabSwitchCount > 0
                                ? "bg-red-500/20 text-red-400 border border-red-500/30 font-mono"
                                : "text-slate-400"
                            }`}
                          >
                            {a.tabSwitchCount} مرات
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              a.isPassed ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {a.isPassed ? "ناجح" : "راسب"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {new Date(a.createdAt).toLocaleDateString("ar-EG")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* مودال إنشاء امتحان جديد */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsExamModalOpen(false)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-4">إنشاء امتحان جديد للمادة</h3>

            <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">المادة:</label>
                <select
                  value={examForm.subjectId}
                  onChange={(e) => setExamForm({ ...examForm, subjectId: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">عنوان الامتحان:</label>
                <input
                  type="text"
                  required
                  value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  placeholder="مثال: كويز 1 على الفصل الأول (تفاضل وتكامل)"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">المدة (بالدقائق):</label>
                  <input
                    type="number"
                    required
                    value={examForm.durationMinutes}
                    onChange={(e) => setExamForm({ ...examForm, durationMinutes: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">إجمالي الدرجات:</label>
                  <input
                    type="number"
                    required
                    value={examForm.totalMarks}
                    onChange={(e) => setExamForm({ ...examForm, totalMarks: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">عدد الأسئلة المسحوبة:</label>
                  <input
                    type="number"
                    required
                    value={examForm.questionsToSelect}
                    onChange={(e) => setExamForm({ ...examForm, questionsToSelect: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">بداية نافذة الدخول:</label>
                  <input
                    type="datetime-local"
                    value={examForm.windowStartTime}
                    onChange={(e) => setExamForm({ ...examForm, windowStartTime: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">نهاية نافذة الدخول:</label>
                  <input
                    type="datetime-local"
                    value={examForm.windowEndTime}
                    onChange={(e) => setExamForm({ ...examForm, windowEndTime: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExamModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
                >
                  حفظ ونشر الامتحان
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال إضافة سؤال إلى بنك الأسئلة */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsQuestionModalOpen(false)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-4">إضافة سؤال جديد لبنك الأسئلة</h3>

            <form onSubmit={handleAddQuestion} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">المادة:</label>
                <select
                  value={questionForm.subjectId}
                  onChange={(e) => setQuestionForm({ ...questionForm, subjectId: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">نص السؤال:</label>
                <textarea
                  required
                  rows={2}
                  value={questionForm.text}
                  onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                  placeholder="اكتب نص السؤال هنا..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">الخيار A:</label>
                  <input
                    type="text"
                    required
                    value={questionForm.optA}
                    onChange={(e) => setQuestionForm({ ...questionForm, optA: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">الخيار B:</label>
                  <input
                    type="text"
                    required
                    value={questionForm.optB}
                    onChange={(e) => setQuestionForm({ ...questionForm, optB: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">الخيار C:</label>
                  <input
                    type="text"
                    required
                    value={questionForm.optC}
                    onChange={(e) => setQuestionForm({ ...questionForm, optC: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">الخيار D:</label>
                  <input
                    type="text"
                    required
                    value={questionForm.optD}
                    onChange={(e) => setQuestionForm({ ...questionForm, optD: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-400 font-bold mb-1">الإجابة الصحيحة:</label>
                  <select
                    value={questionForm.correctAnswer}
                    onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-emerald-500/40 rounded-xl font-bold text-white"
                  >
                    <option value="A">الخيار A</option>
                    <option value="B">الخيار B</option>
                    <option value="C">الخيار C</option>
                    <option value="D">الخيار D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">الدرجة:</label>
                  <input
                    type="number"
                    value={questionForm.points}
                    onChange={(e) => setQuestionForm({ ...questionForm, points: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">تفسير الإجابة (اختياري بعد الامتحان):</label>
                <input
                  type="text"
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  placeholder="سبب صحة هذا الخيار..."
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
                >
                  إضافة السؤال للبنك
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
