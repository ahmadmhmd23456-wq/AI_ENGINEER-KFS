import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * اشتقاق مفتاح تشفير خاص وفريد لكل طالب بناءً على معرّفه الخاص
 * بحيث لا يمكن فك تشفير الرسائل أو الأسرار إلا داخل جلسة الطالب نفسه
 */
function deriveUserVaultKey(userId: string): Buffer {
  const masterSecret =
    process.env.AI_VAULT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "eng-academy-private-vault-key-2026";

  return crypto
    .createHmac("sha256", masterSecret)
    .update(`USER_PRIVATE_VAULT_KEY_V1:${userId}`)
    .digest();
}

export function encryptForUser(userId: string, plaintext: string): string {
  const key = deriveUserVaultKey(userId);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `v1:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptForUser(userId: string, payload: string): string {
  try {
    if (!payload || !payload.startsWith("v1:")) {
      return "";
    }
    const parts = payload.split(":");
    if (parts.length !== 4) return "";

    const [, ivHex, tagHex, dataHex] = parts;
    const key = deriveUserVaultKey(userId);
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(dataHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch {
    return "[محتوى مشفر]";
  }
}
