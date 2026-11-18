import { gmailKonfiguriert, sendeMail as sendMailWithGmail } from "./gmail";
import { resendConfigured, sendMailWithResend } from "./resend";

// The app can send verification mail through Resend (preferred, because it
// needs only an API key) or through the existing Gmail API integration.
// The Gmail path is kept as a fallback so an existing setup keeps working.
export type MailProvider = "resend" | "gmail";

export function activeMailProvider(): MailProvider | null {
  if (resendConfigured()) return "resend";
  if (gmailKonfiguriert()) return "gmail";
  return null;
}

export function mailConfigured(): boolean {
  return activeMailProvider() !== null;
}

export async function sendMail(
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  const provider = activeMailProvider();
  if (provider === "resend") {
    await sendMailWithResend(to, subject, text);
    return;
  }
  if (provider === "gmail") {
    await sendMailWithGmail(to, subject, text);
    return;
  }
  throw new Error(
    "No email provider is configured (set RESEND_API_KEY and RESEND_FROM, or the GMAIL_* variables).",
  );
}
