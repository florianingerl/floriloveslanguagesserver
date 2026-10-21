import crypto from "crypto";

export const CODE_LAENGE = 6;
export const CODE_GUELTIGKEIT_MS = 24 * 60 * 60 * 1000;
export const STANDARD_FRONTEND_URL = "https://florianingerl.github.io";

export function erzeugeVerifizierungscode(): string {
  return String(crypto.randomInt(0, 10 ** CODE_LAENGE)).padStart(
    CODE_LAENGE,
    "0",
  );
}

export function hashVerifizierungscode(code: string): string {
  return crypto.createHash("sha256").update(code, "utf8").digest("hex");
}

export function stimmtVerifizierungscodeUeberein(
  code: string,
  hash: string,
): boolean {
  const hashVomCode = Buffer.from(hashVerifizierungscode(code), "hex");
  const gespeichert = Buffer.from(hash, "hex");
  if (gespeichert.length === 0 || hashVomCode.length !== gespeichert.length) {
    return false;
  }
  return crypto.timingSafeEqual(hashVomCode, gespeichert);
}

export function istCodeAbgelaufen(
  ablaufDatum: Date | null | undefined,
  jetzt: Date = new Date(),
): boolean {
  if (!ablaufDatum) return true;
  return ablaufDatum.getTime() <= jetzt.getTime();
}

export function frontendBestaetigungslink(
  email: string,
  basis: string | undefined = process.env.FRONTEND_URL,
): string {
  const base = (basis || STANDARD_FRONTEND_URL).replace(/\/+$/, "");
  return `${base}/verify-email?email=${encodeURIComponent(email)}`;
}

export function verifizierungsEmail(
  name: string,
  code: string,
  link: string,
): { betreff: string; text: string } {
  return {
    betreff: "Verify your email address - Frag Florian",
    text:
      `Hello ${name},\n\n` +
      `thank you for signing up at Frag Florian!\n\n` +
      `Your one-time verification code is: ${code}\n\n` +
      `Open the verification page and enter the code:\n` +
      `${link}\n\n` +
      `The code is valid for 24 hours and can only be used once.\n\n` +
      `Best regards\n` +
      `Florian`,
  };
}
