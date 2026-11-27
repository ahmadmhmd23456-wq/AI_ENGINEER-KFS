"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Video,
  FileQuestion,
  Users,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Layers,
  Cpu,
  Bot,
  Compass,
  Building2,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

const DEPT_OPTIONS = [
  { id: "ALL", name: "جميع الأقسام والتخصصات", short: "الكل", icon: Layers, tagClass: "bg-slate-800 text-slate-300 border-slate-700" },
  { id: "AI", name: "هندسة الذكاء الاصطناعي", short: "ذكاء اصطناعي", icon: Cpu, tagClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" },
  { id: "MECHATRONICS", name: "هندسة الميكاترونكس والروبوتات", short: "ميكاترونكس", icon: Bot, tagClass: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  { id: "ARCHITECTURE", name: "الهندسة المعمارية والتصميم", short: "معماري", icon: Compass, tagClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  { id: "CIVIL", name: "الهندسة المدنية والإنشائية", short: "مدني", icon: Building2, tagClass: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  { id: "GENERAL", name: "مواد عامة مشتركة لجميع الأقسام", short: "عامة مشتركة", icon: Layers, tagClass: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
];

export default function AdminSubjectsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReordering, setIsReordering] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // الفلاتر
  const [selectedLevelId, setSelectedLevelId] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // المودال
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    price: "300",
    academicLevelId: "",
    term: "1",
    department: "GENERAL",
    order: "1",
  });
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchSubjects = () => {
    setLoading(true);
    let url = "/api/admin/subjects";
    const params = new URLSearchParams();
    if (selectedLevelId) params.append("levelId", selectedLevelId);
    if (selectedTerm) params.append("term", selectedTerm);
    if (selectedDept && selectedDept !== "ALL") params.append("department", selectedDept);
    if (params.toString()) url += `?${params.toString()}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setSubjects(data.subjects || []);
        setLevels(data.levels || []);
        if (!selectedLevelId && data.levels?.length > 0) {
          setFormData((prev) => ({ ...prev, academicLevelId: data.levels[0].id }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubjects();
  }, [selectedLevelId, selectedTerm, selectedDept]);

  const openCreateModal = () => {
    setEditingSubject(null);
    setFormData({
      name: "",
      code: "",
      description: "",
      price: "300",
      academicLevelId: selectedLevelId || (levels[0]?.id ?? ""),
      term: selectedTerm || "1",
      department: selectedDept !== "ALL" ? selectedDept : "GENERAL",
      order: (subjects.length + 1).toString(),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (sub: any) => {
    setEditingSubject(sub);
    setFormData({
      name: sub.name,
      code: sub.code || "",
      description: sub.description || "",
      price: sub.price.toString(),
      academicLevelId: sub.academicLevelId,
      term: sub.term.toString(),
      department: sub.department || "GENERAL",
      order: (sub.order ?? 1).toString(),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSubject?.id,
          ...formData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "فشل حفظ المادة");
        setSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      showToast(editingSubject ? "تم تعديل بيانات المادة وترتيبها بنجاح" : "تمت إضافة المادة بنجاح");
      fetchSubjects();
    } catch {
      alert("حدث خطأ أثناء الحفظ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف مادة "${name}" وجميع محتوياتها؟`)) return;

    try {
      const res = await fetch(`/api/admin/subjects?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast(`تم حذف مادة "${name}"`);
        fetchSubjects();
      } else {
        alert("فشل حذف المادة");
      }
    } catch {
      alert("حدث خطأ بالاتصال");
    }
  };

  // تبديل أو نقل ترتيب مادة للأعلى أو للأسفل
  const handleMoveOrder = async (index: number, direction: "UP" | "DOWN") => {
    const targetIndex = direction === "UP" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= subjects.length) return;

    const currentSub = subjects[index];
    const targetSub = subjects[targetIndex];

    // تبديل محلي فوري للاستجابة اللحظية
    const newSubjects = [...subjects];
    const currentOrder = currentSub.order ?? index + 1;
    const targetOrder = targetSub.order ?? targetIndex + 1;

    // إذا كانت الرتب متطابقة نقوم بتعيين تسلسلي
    let order1 = targetOrder;
    let order2 = currentOrder;
    if (order1 === order2) {
      order1 = direction === "UP" ? Math.max(1, order2 - 1) : order2 + 1;
    }

    currentSub.order = order1;
    targetSub.order = order2;
    newSubjects[index] = targetSub;
    newSubjects[targetIndex] = currentSub;
    setSubjects(newSubjects);

    setIsReordering(true);
    try {
      const res = await fetch("/api/admin/subjects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          swap: {
            id1: currentSub.id,
            id2: targetSub.id,
          },
        }),
      });

      if (!res.ok) {
        // بديل: إرسال كل العناصر بترتيبها الجديد
        const items = newSubjects.map((s, idx) => ({ id: s.id, order: idx + 1 }));
        await fetch("/api/admin/subjects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
      }
      showToast(`تم تغيير ترتيب مادة "${currentSub.name}"`);
      fetchSubjects();
    } catch {
      fetchSubjects();
    } finally {
      setIsReordering(false);
    }
  };

  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const getDeptBadge = (deptId?: string) => {
    const match = DEPT_OPTIONS.find((d) => d.id === (deptId || "GENERAL")) || DEPT_OPTIONS[5];
    const Icon = match.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${match.tagClass}`}>
        <Icon className="w-3 h-3" />
        <span>{match.short}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* إشعار عائم Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* الترويسة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>إدارة وتحديد المواد والأقسام الهندسية</span>
            <span className="px-2.5 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400 font-mono border border-blue-500/30">
              Admin Control
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            حدد لكل مادة قسمها الهندسي ورتّبها حسب الأولوية التي تظهر للطالب في لوحته الدراسية.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/25 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مادة جديدة</span>
        </button>
      </div>

      {/* فلاتر الأقسام السريعة */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-400 ml-2 font-mono flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>تصفية حسب القسم:</span>
        </span>
        {DEPT_OPTIONS.map((dept) => {
          const isSelected = selectedDept === dept.id;
          const Icon = dept.icon;
          return (
            <button
              key={dept.id}
              onClick={() => setSelectedDept(dept.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                isSelected
                  ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{dept.short}</span>
            </button>
          );
        })}
      </div>

      {/* شريط الفلاتر والبحث */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* فلتر الدفعة */}
          <select
            value={selectedLevelId}
            onChange={(e) => setSelectedLevelId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">جميع الدفعات الدراسية</option>
            {levels.map((lvl) => (
              <option key={lvl.id} value={lvl.id}>
                {lvl.name}
              </option>
            ))}
          </select>

          {/* فلتر الترم */}
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">جميع الترمات</option>
            <option value="1">الترم الأول</option>
            <option value="2">الترم الثاني</option>
          </select>
        </div>

        {/* حقل البحث */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم أو كود المادة..."
            className="w-full py-2 pr-9 pl-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute top-2.5 right-3" />
        </div>
      </div>

      {/* قائمة بطاقات المواد مع أدوات الترتيب الفوري للأدمن */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">جاري تحميل المواد...</div>
      ) : filteredSubjects.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">لا توجد مواد مطابقة لهذا الفلتر</h3>
          <p className="text-xs text-slate-500">جرب تغيير القسم أو الترم، أو أضف مادة جديدة الآن وخصصها لقسم محدد.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
            <span className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
              <span>ترتيب المواد (استخدم الأسهم 🔼 🔽 لتحديد الترتيب الذي يراه الطالب أولاً):</span>
            </span>
            <span>{filteredSubjects.length} مادة معروضة</span>
          </div>

          {filteredSubjects.map((subject, index) => (
            <div
              key={subject.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-slate-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm group"
            >
              {/* الجانب الأيمن: أزرار الترتيب، الاسم، الفلاتر، والإحصائيات */}
              <div className="flex items-start sm:items-center gap-4 flex-1">
                {/* كتل وأسهم الترتيب */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={index === 0 || isReordering}
                      onClick={() => handleMoveOrder(index, "UP")}
                      title="تحريك لأعلى في الترتيب"
                      className="p-1 rounded-md bg-slate-950 border border-slate-800 hover:border-blue-500 hover:text-blue-400 text-slate-400 disabled:opacity-30 disabled:hover:border-slate-800 disabled:hover:text-slate-400 transition-all"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === filteredSubjects.length - 1 || isReordering}
                      onClick={() => handleMoveOrder(index, "DOWN")}
                      title="تحريك لأسفل في الترتيب"
                      className="p-1 rounded-md bg-slate-950 border border-slate-800 hover:border-blue-500 hover:text-blue-400 text-slate-400 disabled:opacity-30 disabled:hover:border-slate-800 disabled:hover:text-slate-400 transition-all"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 font-mono font-bold text-sm flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[10px] text-slate-500 -mb-0.5">ترتيب</span>
                    <span>#{subject.order ?? index + 1}</span>
                  </div>
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                      {subject.name}
                    </h3>
                    {subject.code && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800">
                        {subject.code}
                      </span>
                    )}

                    {/* بادج القسم الهندسي */}
                    {getDeptBadge(subject.department)}

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {subject.academicLevel?.name} • ترم {subject.term === 1 ? "أول" : "ثاني"}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 font-mono border border-emerald-500/20">
                      {subject.price} ج.م
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-1 max-w-2xl">
                    {subject.description || "لا يوجد وصف مدخل لهذه المادة."}
                  </p>

                  {/* إحصائيات سريعة */}
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-blue-400" />
                      <span>{subject._count?.lessons || 0} حصص ومحاضرات</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <FileQuestion className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{subject._count?.exams || 0} امتحانات</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{subject._count?.purchases || 0} طالب مشترك</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* الجانب الأيسر: أزرار الإجراءات */}
              <div className="flex items-center justify-end gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/80 flex-shrink-0">
                <button
                  onClick={() => router.push(`/admin/subjects/${subject.id}/content`)}
                  className="py-2 px-3.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>رفع وإدارة الفيديوهات</span>
                </button>

                <button
                  onClick={() => openEditModal(subject)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                  title="تعديل المادة وترتيبها"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDelete(subject.id, subject.name)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
                  title="حذف المادة"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* مودال إنشاء / تعديل مادة */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>{editingSubject ? "تعديل المادة والقسم والترتيب" : "إضافة مادة دراسية وتخصيص قسمها"}</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">اسم المادة:</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: رياضيات هندسية 1 (تفاضل وتكامل)"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* اختيار القسم الهندسي وترتيب الظهور */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">القسم الهندسي المخصص:</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="AI">هندسة الذكاء الاصطناعي (AI)</option>
                    <option value="MECHATRONICS">هندسة الميكاترونكس (Mechatronics)</option>
                    <option value="ARCHITECTURE">الهندسة المعمارية (Architecture)</option>
                    <option value="CIVIL">الهندسة المدنية (Civil)</option>
                    <option value="GENERAL">مواد عامة مشتركة لجميع الأقسام</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">ترتيب الظهور للطالب:</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                    placeholder="1"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">الرقم الأقل يظهر للطالب أولاً</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">كود المادة:</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="MTH-001"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">السعر (ج.م):</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="5"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">الدفعة الدراسية:</label>
                  <select
                    value={formData.academicLevelId}
                    onChange={(e) => setFormData({ ...formData, academicLevelId: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  >
                    {levels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">الترم:</label>
                  <select
                    value={formData.term}
                    onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="1">الترم الأول</option>
                    <option value="2">الترم الثاني</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">وصف المادة:</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="نبذة عن المنهج والموضوعات التي سيتم شرحها..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  {submitting ? "جاري الحفظ..." : editingSubject ? "حفظ التعديلات والترتيب" : "إضافة المادة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}