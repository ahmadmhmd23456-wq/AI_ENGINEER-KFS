import { generateBunnySignedUrl } from "@/lib/bunny";

/**
 * استخراج معرف فيديو يوتيوب (11 حرف) من أي رابط أو نص مدخل
 */
export function extractYoutubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // إذا كان المدخل هو المعرّف نفسه مباشرة (11 حرف)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // الروابط المختلفة:
  // https://www.youtube.com/watch?v=XXXXXX
  // https://youtu.be/XXXXXX
  // https://www.youtube.com/embed/XXXXXX
  // https://www.youtube.com/shorts/XXXXXX
  // https://www.youtube.com/live/XXXXXX
  const regex = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/;
  const match = trimmed.match(regex);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * استخراج معرف Google Drive من الرابط
 */
export function extractGoogleDriveId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const match = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

/**
 * التعرف التلقائي والذكي على نوع مزود الفيديو
 */
export function detectVideoProvider(
  input: string,
  preferredProvider: string = "YOUTUBE"
): { provider: "YOUTUBE" | "BUNNY" | "GOOGLE_DRIVE" | "DIRECT"; videoId: string } {
  const trimmed = (input || "").trim();

  // فحص يوتيوب
  const ytId = extractYoutubeId(trimmed);
  if (ytId) {
    return { provider: "YOUTUBE", videoId: ytId };
  }

  // فحص Google Drive
  const driveId = extractGoogleDriveId(trimmed);
  if (driveId) {
    return { provider: "GOOGLE_DRIVE", videoId: driveId };
  }

  // فحص معرف Bunny (UUID)
  const isBunnyGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
  if (preferredProvider === "BUNNY" || isBunnyGuid) {
    return { provider: "BUNNY", videoId: trimmed };
  }

  // رابط مباشر أو غير ذلك
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return { provider: "DIRECT", videoId: trimmed };
  }

  return {
    provider: (preferredProvider as any) || "YOUTUBE",
    videoId: trimmed,
  };
}

/**
 * توليد رابط التضمين والتشغيل المباشر الآمن حسب نوع المزود
 */
export function generateVideoEmbedUrl(provider: string, videoId: string): string {
  // فحص ذكي في حال كان الرابط يوتيوب حتى لو كان المزود مسجلاً Bunny بالخطأ
  const ytId = extractYoutubeId(videoId);
  if (provider === "YOUTUBE" || ytId) {
    const finalId = ytId || videoId;
    return `https://www.youtube-nocookie.com/embed/${finalId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&enablejsapi=1`;
  }

  if (provider === "GOOGLE_DRIVE") {
    const driveId = extractGoogleDriveId(videoId) || videoId;
    return `https://drive.google.com/file/d/${driveId}/preview`;
  }

  if (provider === "DIRECT") {
    return videoId;
  }

  // افتراضياً: Bunny Stream الموقّع
  try {
    return generateBunnySignedUrl(videoId, 7200);
  } catch {
    return videoId;
  }
}
