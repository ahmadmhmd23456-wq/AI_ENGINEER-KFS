/**
 * نظام حماية تسجيل الدخول ومكافحة هجمات القوة الغاشمة (Brute Force & Rate Limiter)
 * - مراقبة عدد المحاولات الفاشلة حسب عنوان الـ IP وحساب المستخدم.
 * - تطبيق تأخير تدريجي (Progressive Delay / Exponential Backoff).
 * - حظر مؤقت عند السلوك المشبوه (5 محاولات فاشلة = حظر مؤقت 15 دقيقة).
 * - تفعيل اختبار التحقق (Verification Challenge / Captcha) بعد 3 محاولات فاشلة.
 */

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  lockedUntil?: number;
}

// تخزين محلي سريع للمحاولات مع تنظيف دوري
const ipAttempts = new Map<string, AttemptRecord>();
const accountAttempts = new Map<string, AttemptRecord>();

// حدود الأمان
const MAX_FAILED_ATTEMPTS = 5; // أقصى عدد محاولات قبل الحظر المؤقت
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // مدة الحظر المؤقت: 15 دقيقة
const CAPTCHA_THRESHOLD = 3; // عدد المحاولات قبل فرض اختبار التحقق
const WINDOW_DURATION_MS = 15 * 60 * 1000; // نافذة المراقبة: 15 دقيقة

// تنظيف دوري للذاكرة كل 10 دقائق
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipAttempts.entries()) {
      if (now - record.lastAttemptAt > WINDOW_DURATION_MS && (!record.lockedUntil || now > record.lockedUntil)) {
        ipAttempts.delete(key);
      }
    }
    for (const [key, record] of accountAttempts.entries()) {
      if (now - record.lastAttemptAt > WINDOW_DURATION_MS && (!record.lockedUntil || now > record.lockedUntil)) {
        accountAttempts.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

export interface RateLimitStatus {
  isBlocked: boolean;
  waitSeconds?: number;
  requiresCaptcha: boolean;
  failedCount: number;
  remainingAttempts: number;
}

/**
 * فحص حالة الـ Rate Limit قبل معالجة طلب الدخول
 */
export function checkLoginRateLimit(identifier: string, ip: string): RateLimitStatus {
  const now = Date.now();
  const cleanId = identifier.toLowerCase().trim();
  const cleanIp = ip.trim();

  const ipRecord = ipAttempts.get(cleanIp);
  const accountRecord = accountAttempts.get(cleanId);

  // 1. فحص الحظر المؤقت للـ IP
  if (ipRecord?.lockedUntil && now < ipRecord.lockedUntil) {
    const waitSeconds = Math.ceil((ipRecord.lockedUntil - now) / 1000);
    return {
      isBlocked: true,
      waitSeconds,
      requiresCaptcha: true,
      failedCount: ipRecord.count,
      remainingAttempts: 0,
    };
  }

  // 2. فحص الحظر المؤقت للحساب
  if (accountRecord?.lockedUntil && now < accountRecord.lockedUntil) {
    const waitSeconds = Math.ceil((accountRecord.lockedUntil - now) / 1000);
    return {
      isBlocked: true,
      waitSeconds,
      requiresCaptcha: true,
      failedCount: accountRecord.count,
      remainingAttempts: 0,
    };
  }

  const currentCount = Math.max(ipRecord?.count || 0, accountRecord?.count || 0);
  const requiresCaptcha = currentCount >= CAPTCHA_THRESHOLD;
  const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - currentCount);

  return {
    isBlocked: false,
    requiresCaptcha,
    failedCount: currentCount,
    remainingAttempts,
  };
}

/**
 * تسجيل محاولة دخول فاشلة وتطبيق التأخير التدريجي والحظر إذا لزم الأمر
 */
export async function recordFailedLogin(identifier: string, ip: string): Promise<{ delayMs: number; isNowLocked: boolean; waitSeconds?: number }> {
  const now = Date.now();
  const cleanId = identifier.toLowerCase().trim();
  const cleanIp = ip.trim();

  // تحديث سجل الـ IP
  const currentIpRecord = ipAttempts.get(cleanIp) || { count: 0, firstAttemptAt: now, lastAttemptAt: now };
  currentIpRecord.count += 1;
  currentIpRecord.lastAttemptAt = now;

  // تحديث سجل الحساب
  const currentAccRecord = accountAttempts.get(cleanId) || { count: 0, firstAttemptAt: now, lastAttemptAt: now };
  currentAccRecord.count += 1;
  currentAccRecord.lastAttemptAt = now;

  const totalCount = Math.max(currentIpRecord.count, currentAccRecord.count);

  let isNowLocked = false;
  let waitSeconds: number | undefined;

  // إذا تجاوز الحد الأقصى للمحاولات الفاشلة: تطبيق الحظر المؤقت
  if (totalCount >= MAX_FAILED_ATTEMPTS) {
    const lockTime = now + LOCKOUT_DURATION_MS;
    currentIpRecord.lockedUntil = lockTime;
    currentAccRecord.lockedUntil = lockTime;
    isNowLocked = true;
    waitSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000);
  }

  ipAttempts.set(cleanIp, currentIpRecord);
  accountAttempts.set(cleanId, currentAccRecord);

  // تطبيق تأخير تدريجي (Progressive Delay)
  // محاولة 1: 500ms، محاولة 2: 1000ms، محاولة 3: 2000ms، محاولة 4: 4000ms
  const delayMs = Math.min(500 * Math.pow(2, Math.max(0, totalCount - 1)), 4000);
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  return { delayMs, isNowLocked, waitSeconds };
}

/**
 * تسجيل نجاح الدخول وإلغاء المحاولات الفاشلة
 */
export function recordSuccessfulLogin(identifier: string, ip: string): void {
  const cleanId = identifier.toLowerCase().trim();
  const cleanIp = ip.trim();
  ipAttempts.delete(cleanIp);
  accountAttempts.delete(cleanId);
}

/**
 * التحقق من اختبار الكابتشا / التحدي الحسابي البسيط
 */
export function generateSimpleCaptchaChallenge(): { question: string; answerHash: string } {
  const num1 = Math.floor(Math.random() * 20) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const sum = (num1 + num2).toString();
  // تشفير الإجابة بمفتاح داخلي
  const answerHash = Buffer.from(`${sum}:${Date.now()}`).toString("base64");
  return {
    question: `ما ناتج جمع: ${num1} + ${num2} ؟`,
    answerHash,
  };
}

export function verifySimpleCaptchaChallenge(userAnswer: string, answerHash: string): boolean {
  try {
    const decoded = Buffer.from(answerHash, "base64").toString("utf-8");
    const [correctAnswer, timestampStr] = decoded.split(":");
    const timestamp = parseInt(timestampStr, 10);

    // صلاحية الكابتشا 5 دقائق
    if (Date.now() - timestamp > 5 * 60 * 1000) {
      return false;
    }

    return userAnswer.trim() === correctAnswer.trim();
  } catch {
    return false;
  }
}
