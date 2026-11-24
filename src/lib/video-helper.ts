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

/**
 * تحويل مدة ISO 8601 (مثل PT1H23M45S) إلى ثوانٍ
 */
export function parseIsoDuration(iso: string): number | null {
  if (!iso) return null;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return null;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
}

/**
 * تنسيق المدة باللغة العربية بشكل واضح ودقيق (ثوانٍ / دقائق / ساعات)
 */
export function formatDurationArabic(totalSeconds: number): string {
  const sec = Math.max(0, Math.round(totalSeconds || 0));
  if (sec === 0) return "غير محددة";
  if (sec < 60) return `${sec} ثانية`;

  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const remSeconds = sec % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ساعة`);
  if (minutes > 0) parts.push(`${minutes} دقيقة`);
  if (hours === 0 && minutes < 10 && remSeconds > 0) {
    parts.push(`${remSeconds} ثانية`);
  }
  return parts.join(" و ");
}

/**
 * تنسيق المدة بصيغة رقمية مختصرة (مثل 15:20 أو 1:15:00)
 */
export function formatDurationCompact(totalSeconds: number): string {
  const sec = Math.max(0, Math.round(totalSeconds || 0));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const remSeconds = sec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(remSeconds)}`;
  }
  return `${minutes}:${pad(remSeconds)}`;
}

/**
 * جلب بيانات ومدة الفيديو تلقائياً (يوتيوب أو Bunny Stream)
 */
export async function fetchVideoMetadata(
  input: string,
  preferredProvider: string = "YOUTUBE"
): Promise<{
  provider: "YOUTUBE" | "BUNNY" | "GOOGLE_DRIVE" | "DIRECT";
  videoId: string;
  durationSeconds: number | null;
  title: string | null;
}> {
  const detected = detectVideoProvider(input, preferredProvider);
  let durationSeconds: number | null = null;
  let title: string | null = null;

  if (detected.provider === "YOUTUBE") {
    const ytId = detected.videoId;

    // 1. محاولة جلب البيانات عبر صفحة يوتيوب الرسمية (سريعة ولا تتطلب مفتاح API)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(ytId)}&hl=en`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const html = await res.text();
        const metaMatch = html.match(/itemprop="duration"\s+content="([^"]+)"/i);
        if (metaMatch?.[1]) {
          durationSeconds = parseIsoDuration(metaMatch[1]);
        }
        if (!durationSeconds) {
          const lengthMatch = html.match(/"lengthSeconds":"(\d+)"/);
          if (lengthMatch?.[1]) {
            durationSeconds = parseInt(lengthMatch[1], 10);
          }
        }
        if (!durationSeconds) {
          const approxMatch = html.match(/"approxDurationMs":"(\d+)"/);
          if (approxMatch?.[1]) {
            durationSeconds = Math.round(parseInt(approxMatch[1], 10) / 1000);
          }
        }
      }
    } catch {
      // المتابعة للبديل التالي
    }

    // 2. بديل احتياطي عبر YouTube Innertube API إذا لم تنجح الطريقة الأولى
    if (!durationSeconds) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const innertubeRes = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId: ytId,
            context: {
              client: {
                clientName: "ANDROID",
                clientVersion: "19.09.37",
                androidSdkVersion: 30,
                hl: "en",
                gl: "US",
              },
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (innertubeRes.ok) {
          const data = await innertubeRes.json();
          const len = data?.videoDetails?.lengthSeconds;
          if (len) durationSeconds = parseInt(String(len), 10);
          if (data?.videoDetails?.title) title = String(data.videoDetails.title);
        }
      } catch {
        // تجاهل
      }
    }

    // 3. جلب العنوان عبر YouTube oEmbed إن لم يتوفر
    if (!title) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(ytId)}&format=json`,
          { signal: controller.signal }
        );
        clearTimeout(timer);
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          if (oembedData?.title) title = String(oembedData.title);
        }
      } catch {
        // تجاهل
      }
    }
  } else if (detected.provider === "BUNNY") {
    const apiKey = process.env.BUNNY_API_KEY;
    const libraryId = process.env.BUNNY_LIBRARY_ID;
    if (apiKey && libraryId) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const bunnyRes = await fetch(
          `https://video.bunnycdn.com/library/${libraryId}/videos/${encodeURIComponent(detected.videoId)}`,
          {
            headers: { AccessKey: apiKey },
            signal: controller.signal,
          }
        );
        clearTimeout(timer);
        if (bunnyRes.ok) {
          const bData = await bunnyRes.json();
          if (typeof bData?.length === "number" && bData.length > 0) {
            durationSeconds = Math.round(bData.length);
          }
          if (bData?.title) title = String(bData.title);
        }
      } catch {
        // تجاهل
      }
    }
  }

  return {
    provider: detected.provider,
    videoId: detected.videoId,
    durationSeconds: durationSeconds && durationSeconds > 0 ? durationSeconds : null,
    title,
  };
}
