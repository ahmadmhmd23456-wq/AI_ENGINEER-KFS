import crypto from "crypto";

/**
 * توليد رابط موقّع مؤقت لقراءة ملف PDF من Cloudflare R2 / AWS S3
 * مدة الصلاحية: 15 دقيقة فقط
 */
export function generatePresignedPdfUrl(s3Key: string, expiresInSeconds: number = 900): string {
  const endpoint = process.env.S3_ENDPOINT || "https://handasa.r2.cloudflarestorage.com";
  const bucketName = process.env.S3_BUCKET_NAME || "handasa-pdfs";
  const secretKey = process.env.S3_SECRET_ACCESS_KEY || "demo_secret";

  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(`${bucketName}/${s3Key}/${expires}`)
    .digest("hex");

  // رابط آمن ومؤقت بمحددات التوقيع
  return `${endpoint}/${bucketName}/${s3Key}?token=${signature}&expires=${expires}`;
}
