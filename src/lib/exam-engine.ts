import prisma from "./prisma";
import { sendExamResultWhatsApp } from "./whatsapp";

// Seeded PRNG (Mulberry32) لتوليد أرقام عشوائية ثابتة بناءً على Seed
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// دالة خلط مصفوفة باستخدام الـ PRNG
function seededShuffle<T>(array: T[], randomFn: () => number): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * بدء محاولة امتحان جديدة للطالب أو استئناف محاولته الجارية
 */
export async function startOrResumeExam(params: {
  examId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { examId, userId, ipAddress, userAgent } = params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      subject: true,
      attempts: {
        where: { userId },
      },
    },
  });

  if (!exam) {
    throw new Error("الامتحان غير موجود");
  }

  const now = new Date();

  // 1. فحص هل لدى الطالب محاولة سابقة؟
  const existingAttempt = exam.attempts[0];
  if (existingAttempt) {
    // إذا كان الامتحان قد تم تسليمه بالفعل
    if (existingAttempt.status === "SUBMITTED" || existingAttempt.status === "TIMED_OUT") {
      const review = await getExamAttemptReview(existingAttempt.id, userId);
      return {
        isFinished: true,
        attempt: existingAttempt,
        review,
        message: "لقد أتممت محاولتك في هذا الامتحان بالفعل.",
      };
    }

    // إذا كانت المحاولة جارية، نفحص هل انتهى وقت السيرفر؟
    if (now > new Date(existingAttempt.serverDueTime)) {
      // تسليم تلقائي لانتهاء الوقت
      const finishedAttempt = await finalizeAndGradeAttempt(existingAttempt.id, userId, true);
      const review = await getExamAttemptReview(finishedAttempt.id, userId);
      return {
        isFinished: true,
        attempt: finishedAttempt,
        review,
        message: "انتهى الوقت المخصص للامتحان وتم تسليمه تلقائياً.",
      };
    }

    // استئناف نفس المحاولة ونفس الأسئلة تماماً
    const remainingSeconds = Math.max(
      0,
      Math.floor((new Date(existingAttempt.serverDueTime).getTime() - now.getTime()) / 1000)
    );

    return {
      isFinished: false,
      attemptId: existingAttempt.id,
      assignedQuestions: existingAttempt.assignedQuestions,
      savedAnswers: existingAttempt.submittedAnswers || {},
      remainingSeconds,
      tabSwitchCount: existingAttempt.tabSwitchCount,
      serverDueTime: existingAttempt.serverDueTime,
    };
  }

  // 2. فحص نافذة دخول الامتحان
  if (now < new Date(exam.windowStartTime)) {
    throw new Error(
      `لم يحن موعد فتح الامتحان بعد. يفتح في: ${new Date(exam.windowStartTime).toLocaleString("ar-EG")}`
    );
  }

  if (now > new Date(exam.windowEndTime)) {
    throw new Error("انتهت نافذة الدخول المسموح بها لهذا الامتحان.");
  }

  // 3. جلب بنك أسئلة المادة
  const questionsBank = await prisma.question.findMany({
    where: { subjectId: exam.subjectId },
  });

  if (questionsBank.length === 0) {
    throw new Error("بنك الأسئلة فارغ لهذه المادة حالياً.");
  }

  // 4. توليد Seed عشوائي فريد لهذه المحاولة
  const seed = Math.floor(Math.random() * 2147483647);
  const randomFn = mulberry32(seed);

  // اختيار عدد الأسئلة المطلوب عشوائياً وخلط ترتيبها
  const shuffledBank = seededShuffle(questionsBank, randomFn);
  const countToSelect = Math.min(exam.questionsToSelect, shuffledBank.length);
  const selectedQuestions = shuffledBank.slice(0, countToSelect);

  // تجهيز مصفوفة الأسئلة للعميل (بدون الإجابات الصحيحة والتوضيحات) مع خلط الخيارات
  const clientQuestions = selectedQuestions.map((q: any) => {
    let options = Array.isArray(q.options) ? (q.options as any[]) : [];
    const shuffledOptions = seededShuffle(options, randomFn).map((opt: any) => ({
      id: opt.id,
      text: opt.text,
    }));

    return {
      id: q.id,
      text: q.text,
      imageUrl: q.imageUrl,
      type: q.type,
      points: Number(q.points),
      options: shuffledOptions,
    };
  });

  // حساب وقت انتهاء السيرفر (Duration)
  const serverDueTime = new Date(Date.now() + exam.durationMinutes * 60 * 1000);

  // 5. إنشاء محاولة الطالب في قاعدة البيانات (محاولة واحدة فقط وفريدة)
  const newAttempt = await prisma.examAttempt.create({
    data: {
      examId,
      userId,
      seed,
      assignedQuestions: clientQuestions,
      submittedAnswers: {},
      serverDueTime,
      status: "IN_PROGRESS",
      ipAddress,
      userAgent,
    },
  });

  const remainingSeconds = Math.floor((serverDueTime.getTime() - Date.now()) / 1000);

  return {
    isFinished: false,
    attemptId: newAttempt.id,
    assignedQuestions: clientQuestions,
    savedAnswers: {},
    remainingSeconds,
    tabSwitchCount: 0,
    serverDueTime,
  };
}

/**
 * حفظ الإجابات التلقائي وتسجيل مغادرة التبويب (Tab Switching / Anti-cheat)
 */
export async function autoSaveAttemptAnswers(params: {
  attemptId: string;
  userId: string;
  answers: Record<string, string>;
  tabSwitched?: boolean;
}) {
  const { attemptId, userId, answers, tabSwitched } = params;

  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, userId },
  });

  if (!attempt || attempt.status !== "IN_PROGRESS") {
    return { success: false, error: "المحاولة غير متاحة أو منتهية" };
  }

  // فحص الوقت
  if (new Date() > new Date(attempt.serverDueTime)) {
    return { success: false, error: "انتهى الوقت المسموح" };
  }

  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      submittedAnswers: answers,
      tabSwitchCount: tabSwitched ? { increment: 1 } : undefined,
    },
  });

  return { success: true };
}

/**
 * تسليم نهائي للامتحان والتصحيح الآلي على السيرفر
 */
export async function finalizeAndGradeAttempt(
  attemptId: string,
  userId: string,
  isTimedOut: boolean = false,
  finalAnswers?: Record<string, string>
) {
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      exam: true,
      user: true,
    },
  });

  if (!attempt) throw new Error("المحاولة غير موجودة");

  if (attempt.status === "SUBMITTED" || (attempt.status === "TIMED_OUT" && !isTimedOut)) {
    return attempt;
  }

  const answers = finalAnswers || (attempt.submittedAnswers as Record<string, string>) || {};

  // جلب الأسئلة الأصلية من قاعدة البيانات بمفاتيح الإجابات الصحيحة
  const assigned = attempt.assignedQuestions as any[];
  const questionIds = assigned.map((q) => q.id);

  const originalQuestions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
  });

  const questionMap = new Map(originalQuestions.map((q) => [q.id, q]));

  // تصحيح كل سؤال بدقة
  let totalScore = 0;
  let maxPossibleScore = 0;

  for (const q of assigned) {
    const original: any = questionMap.get(q.id);
    if (!original) continue;

    const points = Number(original.points);
    maxPossibleScore += points;

    const studentAnswer = answers[q.id];
    if (studentAnswer && studentAnswer.trim() === original.correctAnswer.trim()) {
      totalScore += points;
    }
  }

  const isPassed = totalScore >= Number(attempt.exam.passMarks);

  // تحديث حالة المحاولة والدرجة
  const finished = await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      submittedAnswers: answers,
      score: totalScore,
      isPassed,
      status: isTimedOut ? "TIMED_OUT" : "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  // إرسال رسالة واتساب فورية بالنتيجة للطالب
  if (attempt.user.phone) {
    try {
      await sendExamResultWhatsApp({
        phone: attempt.user.phone,
        studentName: attempt.user.name,
        examTitle: attempt.exam.title,
        score: totalScore,
        totalMarks: Number(attempt.exam.totalMarks),
      });
    } catch (e) {
      console.error("فشل إرسال إشعار نتيجة الامتحان عبر الواتساب:", e);
    }
  }

  return finished;
}

/**
 * جلب تفاصيل الامتحان الكاملة والإجابات النموذجية بعد انتهاء الوقت أو التسليم
 */
export async function getExamAttemptReview(attemptId: string, userId: string) {
  let attempt: any = await prisma.examAttempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      exam: {
        include: {
          subject: true,
        },
      },
      user: true,
    },
  });

  if (!attempt) {
    throw new Error("محاولة الامتحان غير موجودة");
  }

  const now = new Date();
  const isTimeExpired = now > new Date(attempt.serverDueTime);

  // إذا كانت المحاولة ما زالت IN_PROGRESS ولكن وقت السيرفر انتهى، نسلمها فوراً
  if (attempt.status === "IN_PROGRESS" && isTimeExpired) {
    attempt = await finalizeAndGradeAttempt(attempt.id, userId, true);
    // Reload with relations
    attempt = await prisma.examAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        exam: {
          include: {
            subject: true,
          },
        },
        user: true,
      },
    });
  }

  // إذا لم تنتهِ المحاولة بعد ولم ينتهِ الوقت، نمنع عرض الإجابات حفاظاً على سرية الامتحان
  if (attempt.status === "IN_PROGRESS" && !isTimeExpired) {
    throw new Error("لا يمكن عرض الإجابات أثناء استمرار وقت الامتحان");
  }

  const assignedQuestions = (attempt.assignedQuestions as any[]) || [];
  const submittedAnswers = (attempt.submittedAnswers as Record<string, string>) || {};
  const questionIds = assignedQuestions.map((q: any) => q.id);

  // جلب الأسئلة الأصلية مع مفاتيح الإجابات والشرح
  const originalQuestions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
  });

  const questionMap = new Map(originalQuestions.map((q: any) => [q.id, q]));

  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  const reviewQuestions = assignedQuestions.map((clientQ: any, index: number) => {
    const original: any = questionMap.get(clientQ.id);
    const studentAnswer = submittedAnswers[clientQ.id] || null;
    const correctAnswer = original ? original.correctAnswer : null;
    const isAnswered = studentAnswer !== null && studentAnswer !== undefined && studentAnswer !== "";

    let isCorrect = false;
    if (isAnswered && correctAnswer) {
      isCorrect = String(studentAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
    }

    if (!isAnswered) {
      unansweredCount++;
    } else if (isCorrect) {
      correctCount++;
    } else {
      wrongCount++;
    }

    // مطابقة خيارات السؤال لإظهار نصوصها وحالتها
    const options = (clientQ.options || []).map((opt: any) => {
      const isSelectedByStudent = studentAnswer === opt.id || studentAnswer === opt.text;
      const isTheCorrectOption =
        correctAnswer === opt.id ||
        correctAnswer === opt.text ||
        (original?.options &&
          Array.isArray(original.options) &&
          original.options.find(
            (o: any) =>
              (o.id === opt.id || o.text === opt.text) &&
              (o.isCorrect || o.id === correctAnswer || o.text === correctAnswer)
          ));

      return {
        id: opt.id,
        text: opt.text,
        isSelected: !!isSelectedByStudent,
        isCorrectOption: !!isTheCorrectOption,
      };
    });

    // العثور على نص الإجابة الصحيحة لعرضه بشكل صريح
    let correctAnswerText = correctAnswer;
    const matchedCorrectOption = options.find((o: any) => o.isCorrectOption);
    if (matchedCorrectOption) {
      correctAnswerText = matchedCorrectOption.text;
    }

    // العثور على نص إجابة الطالب
    let studentAnswerText = studentAnswer;
    const matchedStudentOption = options.find((o: any) => o.isSelected);
    if (matchedStudentOption) {
      studentAnswerText = matchedStudentOption.text;
    }

    return {
      index: index + 1,
      id: clientQ.id,
      text: original?.text || clientQ.text,
      imageUrl: original?.imageUrl || clientQ.imageUrl,
      type: original?.type || clientQ.type,
      points: Number(original?.points || clientQ.points || 1),
      options,
      studentAnswer,
      studentAnswerText,
      correctAnswer,
      correctAnswerText,
      isCorrect,
      isAnswered,
      explanation: original?.explanation || null,
    };
  });

  const totalQuestions = assignedQuestions.length;
  const calculatedTotalMarks = reviewQuestions.reduce((sum: number, q: any) => sum + Number(q.points || 0), 0);
  const totalMarks = calculatedTotalMarks > 0 ? calculatedTotalMarks : Number(attempt.exam.totalMarks || 10);
  const score = Number(attempt.score || 0);
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  return {
    attemptId: attempt.id,
    examId: attempt.examId,
    examTitle: attempt.exam.title,
    subjectName: attempt.exam.subject?.name || "المادة",
    durationMinutes: attempt.exam.durationMinutes,
    totalMarks,
    passMarks: Number(attempt.exam.passMarks),
    score,
    percentage,
    isPassed: attempt.isPassed ?? false,
    status: attempt.status,
    submittedAt: attempt.submittedAt,
    startedAt: attempt.startedAt,
    tabSwitchCount: attempt.tabSwitchCount,
    totalQuestions,
    correctCount,
    wrongCount,
    unansweredCount,
    reviewQuestions,
  };
}
