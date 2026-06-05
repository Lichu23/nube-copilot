import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string, secret: string) {
  if (!value) {
    throw new Error("Secret value is required for encryption.");
  }

  if (!secret) {
    throw new Error("Encryption secret is required.");
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(value: string, secret: string) {
  if (!value) {
    throw new Error("Encrypted value is required for decryption.");
  }

  if (!secret) {
    throw new Error("Encryption secret is required.");
  }

  const [ivPart, tagPart, encryptedPart] = value.split(".");

  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error("Encrypted value has an invalid format.");
  }

  const decipher = createDecipheriv(ALGORITHM, getKey(secret), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
