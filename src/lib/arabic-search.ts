/**
 * محرك البحث العربي المتقدم لمنصة هندسة التعليمية
 * يحل مشكلات الهمزات (أ، إ، آ، ا)، التاء المربوطة (ة، ه)، والياء والألف المقصورة (ي، ى)
 * ويدعم البحث متعدد الكلمات (مثل كتابة "احمد رضا" للوصول لـ "احمد محمد رضا").
 */

export function getArabicVariants(term: string): string[] {
  const trimmed = term.trim();
  if (!trimmed) return [];

  // إزالة التشكيل
  const clean = trimmed.replace(/[\u064B-\u065F\u0670]/g, "");

  const variants = new Set<string>();
  variants.add(clean);

  // استبدال الهمزات بالألف العادية
  const noHamza = clean.replace(/[أإآ]/g, "ا");
  variants.add(noHamza);

  // استبدال الألف بالهمزة
  const withHamza = clean.replace(/ا/g, "أ");
  variants.add(withHamza);

  // التاء المربوطة والهاء
  const withHaa = clean.replace(/ة/g, "ه");
  const withTaa = clean.replace(/ه/g, "ة");
  variants.add(withHaa);
  variants.add(withTaa);

  // الياء والألف المقصورة
  const withYaa = clean.replace(/ى/g, "ي");
  const withAlefMaksoura = clean.replace(/ي/g, "ى");
  variants.add(withYaa);
  variants.add(withAlefMaksoura);

  // تركيبات شائعة (ألف بدون همزة + ياء عادية + تاء مربوطة)
  const fullyNormalized = clean
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
  variants.add(fullyNormalized);

  const fullyHamza = clean
    .replace(/ا/g, "أ")
    .replace(/ه/g, "ة")
    .replace(/ي/g, "ى");
  variants.add(fullyHamza);

  return Array.from(variants).filter((v) => v.length > 0);
}

/**
 * تحويل الأرقام العربية المشرقية والفارسية إلى أرقام إنجليزية
 */
export function normalizeArabicDigits(input: string): string {
  if (!input) return "";
  return input
    .replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)])
    .replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)]);
}

/**
 * تنظيف وتوحيد رقم الهاتف المصري لدعم كل التنسيقات (أرقام عربية، +20، مسافات)
 */
export function normalizeEgyptianPhone(phone: string): string {
  if (!phone) return "";
  let clean = normalizeArabicDigits(phone)
    .replace(/[\s\-\(\)\.]/g, "")
    .trim();

  if (clean.startsWith("+20")) clean = clean.slice(3);
  else if (clean.startsWith("0020")) clean = clean.slice(4);
  else if (clean.startsWith("20") && clean.length === 12) clean = clean.slice(2);

  if (
    clean.length === 10 &&
    (clean.startsWith("10") ||
      clean.startsWith("11") ||
      clean.startsWith("12") ||
      clean.startsWith("15"))
  ) {
    clean = "0" + clean;
  }

  return clean;
}

/**
 * بناء استعلام Prisma للبحث الشامل
 */
export function buildStudentSearchQuery(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return {};

  const words = trimmed.split(/\s+/).filter(Boolean);

  // إذا كانت المدخلات رقماً، نبحث في الهاتف والـ IP
  const isNumberOrPhone = /^[0-9+]+$/.test(trimmed);
  if (isNumberOrPhone) {
    return {
      OR: [
        { phone: { contains: trimmed } },
        {
          devices: {
            some: {
              ipAddress: { contains: trimmed },
            },
          },
        },
      ],
    };
  }

  // إذا كان إيميل (يحتوي على @)
  if (trimmed.includes("@")) {
    return {
      OR: [
        { email: { contains: trimmed, mode: "insensitive" } },
        { initialEmail: { contains: trimmed, mode: "insensitive" } },
      ],
    };
  }

  // لكل كلمة في الاستعلام، نجمع مرادفاتها العربية
  const wordConditions = words.map((w) => {
    const variants = getArabicVariants(w);
    return {
      OR: [
        ...variants.map((v) => ({ name: { contains: v, mode: "insensitive" as const } })),
        { email: { contains: w, mode: "insensitive" as const } },
        { phone: { contains: w } },
        { phoneType: { contains: w, mode: "insensitive" as const } },
        {
          devices: {
            some: {
              OR: [
                { deviceModel: { contains: w, mode: "insensitive" as const } },
                { deviceName: { contains: w, mode: "insensitive" as const } },
                { ipAddress: { contains: w } },
              ],
            },
          },
        },
      ],
    };
  });

  return {
    AND: wordConditions,
  };
}
