"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Lock,
  Unlock,
  CheckCircle2,
  CreditCard,
  Smartphone,
  Zap,
  ArrowRight,
  RefreshCw,
  X,
  GraduationCap,
  Video,
  FileQuestion,
  FileText,
  Sparkles,
  Heart,
} from "lucide-react";
import {
  playCyberHover,
  playCyberClick,
  playWhoosh,
  playSuccessChime,
} from "@/lib/sound";

export default function StudentCoursesPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTerm, setCurrentTerm] = useState<1 | 2>(1);

  // حالة مودال الدفع
  const [selectedSubjectToBuy, setSelectedSubjectToBuy] = useState<any | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"WALLET" | "CARD" | "INSTAPAY">("WALLET");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const fetchCourses = () => {
    setLoading(true);
    fetch("/api/student/courses")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCheckout = async (isDemoInstant: boolean = false) => {
    if (!selectedSubjectToBuy) return;
    setIsProcessingPayment(true);

    try {
      const res = await fetch("/api/purchases/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selectedSubjectToBuy.id,
          paymentMethod: selectedPaymentMethod,
          isDemoInstantPay: isDemoInstant,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "فشل إتمام المعاملة");
        setIsProcessingPayment(false);
        return;
      }

      if (json.isInstantUnlocked) {
        playSuccessChime();
        alert("🎉 تم تأكيد الاشتراك بنجاح! تم فتح المادة على حسابك.");
        setSelectedSubjectToBuy(null);
        fetchCourses();
      } else if (json.paymentUrl) {
        window.location.href = json.paymentUrl;
      }
    } catch {
      alert("حدث خطأ أثناء الاتصال ببوابة الدفع");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-xs text-slate-400">جاري تحميل موادك الدراسية...</p>
        </div>
      </div>
    );
  }

  const { user, subjects } = data || {};
  const filteredSubjects = subjects?.filter((s: any) => s.term === currentTerm) || [];

  return (
    <div className="space-y-6" dir="rtl">
      {/* بطاقة ترحيبية ومعلومات الدفعة */}
      <div className="eng-scroll-item fox-scroll-item bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-blue-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-xs font-bold flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4" />
                <span>{user?.academicLevel?.name || "إعدادي هندسة"}</span>
              </span>
              <span className="text-xs text-slate-400">| 5 مواد لكل ترم</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              مرحباً يا بشمهندس، {user?.name || ""} 👋
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              المواد مرتبة بالتسلسل الأكاديمي. يمكنك الدخول لأي مادة مشتركة لمتابعة الحصص والامتحانات.
            </p>
          </div>

          {/* محدد الترم */}
          <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1 self-start sm:self-auto">
            <button
              onClick={() => {
                playWhoosh();
                setCurrentTerm(1);
              }}
              onMouseEnter={playCyberHover}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTerm === 1 ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400 hover:text-white"
              }`}
            >
              الترم الأول
            </button>
            <button
              onClick={() => {
                playWhoosh();
                setCurrentTerm(2);
              }}
              onMouseEnter={playCyberHover}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTerm === 2 ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400 hover:text-white"
              }`}
            >
              الترم الثاني
            </button>
          </div>
        </div>
      </div>

      {/* قائمة المواد مرتبة رأسياً تحت بعضها مع الانيميشن والمؤثرات الصوتية */}
      <div className="space-y-4">
        {filteredSubjects.map((sub: any, index: number) => {
          const isUnlocked = sub.isPurchased;
          const scrollDelay = index === 0 ? "fox-delay-75" : index === 1 ? "fox-delay-150" : index === 2 ? "fox-delay-200" : index === 3 ? "fox-delay-250" : "fox-delay-300";
          return (
            <div
              key={sub.id}
              onMouseEnter={playCyberHover}
              className={`eng-scroll-item fox-scroll-item ${scrollDelay} rounded-2xl border p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                isUnlocked
                  ? "bg-slate-900/95 border-emerald-500/30 shadow-lg shadow-emerald-950/10 hover:border-emerald-500/50"
                  : "bg-slate-900/70 border-slate-800 hover:border-blue-500/40"
              }`}
            >
              {/* الجانب الأيمن: الترتيب، الأيقونة، الاسم، والوصف */}
              <div className="flex items-start gap-4 flex-1">
                {/* رقم ترتيب المادة */}
                <div
                  className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center font-bold text-sm font-mono border ${
                    isUnlocked
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-slate-950 text-slate-400 border-slate-800"
                  }`}
                >
                  0{index + 1}
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-white hover:text-blue-400 transition-colors">
                      {sub.name}
                    </span>
                    {sub.code && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800">
                        {sub.code}
                      </span>
                    )}
                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>مفعلة بحسابك</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                        <Lock className="w-3 h-3 text-slate-500" />
                        <span>غير مشتركة</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                    {sub.description || "شرح تفصيلي للمنهج، محاضرات فيديو، شيتات تمارين محلولة وامتحانات دورية."}
                  </p>

                  {/* إحصائيات المحتوى الداخلي */}
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-blue-400" />
                      <span>{sub._count?.lessons || 2} حصص ومحاضرات</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <FileQuestion className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{sub._count?.exams || 1} امتحانات تفاعلية</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>شيتات وملخصات PDF</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* الجانب الأيسر: السعر وزر الإجراء */}
              <div className="flex items-center md:flex-col md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800/80 flex-shrink-0">
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {sub.price} ج.م
                  </div>
                  <div className="text-[10px] text-slate-500">شامل الترم كاملاً</div>
                </div>

                {isUnlocked ? (
                  <button
                    onClick={() => {
                      playCyberClick();
                      router.push(`/student/courses/${sub.id}`);
                    }}
                    onMouseEnter={playCyberHover}
                    className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30 whitespace-nowrap hover:scale-105 active:scale-95"
                  >
                    <span>دخول المادة</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      playCyberClick();
                      setSelectedSubjectToBuy(sub);
                    }}
                    onMouseEnter={playCyberHover}
                    className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/25 whitespace-nowrap hover:scale-105 active:scale-95"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>شراء وتفعيل ({sub.price} ج.م)</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 💌 رسالة مؤثرة من فريق المنصة وتيم تصوير الفيديوهات لمهندسي المستقبل */}
      <div className="eng-scroll-item fox-scroll-item relative rounded-3xl bg-gradient-to-b from-blue-950/40 via-slate-900 to-slate-950 border border-blue-500/30 p-6 sm:p-8 shadow-2xl overflow-hidden eng-glow-blue mt-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 pulse-ring flex-shrink-0">
                <Heart className="w-5 h-5 text-red-300" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-400 font-mono tracking-wider block">A MESSAGE FROM THE TEAM</span>
                <h3 className="text-base sm:text-lg font-extrabold text-white">رسالة من القلب.. لكل مهندس ومهندسة في مصر 🇪🇬</h3>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center gap-1.5 self-start sm:self-auto">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>معاً حتى التخرج وبامتياز</span>
            </span>
          </div>

          <div className="space-y-3.5 text-slate-300 text-xs sm:text-sm leading-relaxed">
            <p className="font-bold text-white text-sm sm:text-base">يا بشمهندس المستقبل..</p>
            <p>
              إحنا عارفين كويس إن <span className="text-blue-400 font-semibold">طريق كلية الهندسة مش مفروش بالورد</span>. عارفين يعني إيه تفضل سهران للساعة 4 الصبح وسط شيتات الماث ومسائل الاستاتيكا والديناميكا المعقدة، وعارفين ضغط الكويزات والميدترم، والتوهة اللي بتمر بيها وسط كمية المقررات.
            </p>
            <p>
              عشان كدة المنصة دي مكنتش بالنسبة لينا مجرد كود اتكتب أو كاميرا اتفتحت وصورت.. <strong className="text-white">كل دقيقة فيديو</strong> اتسجلت، اتعادت مرة واتنين وتلاتة عشان تطلعلك بأعلى نقاء وجودة وبدون أي حشو، وتدخل في صلب الفهم الهندسي فوراً. وكل شيت اتحل خطوة بخطوة، وكل كود أمان ومؤثر صوتي اتصمم، كان معمول بهدف واحد: <span className="text-emerald-400 font-semibold">إنك تلاقي ضهر وسند حقيقي في دراستك</span>.
            </p>
            <p>
              سعر الاشتراك الرمزي <span className="font-mono font-bold text-white bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">50 ج.م</span> للمادة مكنش تجارة، ده كان عهد مننا عشان مفيش طالب هندسة في مصر يحس إن المادة تقيلة عليه أو إن في عائق مادي بينه وبين الشرح "الفول أوبشن" اللي يستحقه ويوصله للدرجة النهائية.
            </p>
            <p className="pt-2 text-white font-medium">
              أنت مش مجرد رقم على المنصة.. <span className="laser-shimmer-text font-black text-base">أنت مشروع مهندس عظيم بكره هيبني بلده ويفتخر بيه أهله ونفتخر بيه إحنا كمان.</span>
            </p>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 font-bold text-xs">
                ENG
              </div>
              <div>
                <div className="text-xs font-bold text-white">د. محمد & فريق التصوير وتطوير المنصة</div>
                <div className="text-[10px] text-slate-400">في ضهرك من إعدادي حتى مشروع التخرج 📐</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Designed with passion for Egyptian Engineering Students
            </div>
          </div>
        </div>
      </div>

      {/* مودال الدفع المصري المتكامل */}
      {selectedSubjectToBuy && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedSubjectToBuy(null)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">تأكيد الاشتراك والشراء</h3>
                <p className="text-xs text-slate-400">{selectedSubjectToBuy.name}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl mb-5 flex items-center justify-between">
              <span className="text-xs text-slate-400">إجمالي المبلغ المطلوب:</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {selectedSubjectToBuy.price} ج.م
              </span>
            </div>

            {/* طرق الدفع */}
            <div className="space-y-2.5 mb-6 text-xs">
              <label className="font-bold text-slate-300 block mb-1">اختر طريقة الدفع المناسبة لك:</label>

              <label
                onClick={() => setSelectedPaymentMethod("WALLET")}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedPaymentMethod === "WALLET"
                    ? "bg-blue-600/15 border-blue-500 text-white"
                    : "bg-slate-950/60 border-slate-800 text-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-bold">محفظة إلكترونية (فودافون كاش / أورنج / اتصالات / وي)</div>
                    <div className="text-[10px] text-slate-400">الدفع الفوري عبر رقم المحفظة برمز OTP</div>
                  </div>
                </div>
                <input type="radio" checked={selectedPaymentMethod === "WALLET"} readOnly />
              </label>

              <label
                onClick={() => setSelectedPaymentMethod("INSTAPAY")}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedPaymentMethod === "INSTAPAY"
                    ? "bg-blue-600/15 border-blue-500 text-white"
                    : "bg-slate-950/60 border-slate-800 text-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="font-bold">انستا باي (InstaPay)</div>
                    <div className="text-[10px] text-slate-400">تحويل بنكي لحظي لحساب المدرس المعتمد</div>
                  </div>
                </div>
                <input type="radio" checked={selectedPaymentMethod === "INSTAPAY"} readOnly />
              </label>

              <label
                onClick={() => setSelectedPaymentMethod("CARD")}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedPaymentMethod === "CARD"
                    ? "bg-blue-600/15 border-blue-500 text-white"
                    : "bg-slate-950/60 border-slate-800 text-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="font-bold">بطاقة بنكية (فيزا / ماستركارد / ميزة)</div>
                    <div className="text-[10px] text-slate-400">بوابة دفع آمنة ومشفرة عبر Paymob</div>
                  </div>
                </div>
                <input type="radio" checked={selectedPaymentMethod === "CARD"} readOnly />
              </label>
            </div>

            {/* أزرار الدفع */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleCheckout(false)}
                disabled={isProcessingPayment}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50"
              >
                {isProcessingPayment ? "جاري تحويلك لبوابة الدفع..." : "المتابعة للدفع عبر Paymob"}
              </button>

              <button
                type="button"
                onClick={() => handleCheckout(true)}
                disabled={isProcessingPayment}
                className="w-full py-2.5 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <span>محاكاة دفع فوري ناجح (بيئة التطوير)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
