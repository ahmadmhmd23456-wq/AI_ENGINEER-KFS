import crypto from "crypto";

/**
 * توليد رابط فيديو موقّع ومحمي من Bunny Stream (Token Authentication)
 * تنتهي صلاحيته بعد مدة محددة (افتراضياً: ساعتان)
 */
export function generateBunnySignedUrl(videoId: string, expiresInSeconds: number = 7200): string {
  const libraryId = process.env.BUNNY_LIBRARY_ID || "123456";
  const tokenKey = process.env.BUNNY_TOKEN_AUTH_KEY || "demo_token_key";
  const cdnHostname = process.env.BUNNY_CDN_HOSTNAME || "vz-demo.b-cdn.net";

  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const hashableBase = `${tokenKey}${videoId}${expires}`;
  const token = crypto.createHash("sha256").update(hashableBase).digest("hex");

  // رابط التضمين الموقّع HLS / Iframe
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}&autoplay=true`;
}

/**
 * فحص توقيع Bunny Webhook في حال استخدام المعالجة التلقائية
 */
export function verifyBunnyWebhook(signature: string, rawBody: string): boolean {
  const apiKey = process.env.BUNNY_API_KEY || "";
  const calculated = crypto.createHmac("sha256", apiKey).update(rawBody).digest("hex");
  return signature === calculated;
}
