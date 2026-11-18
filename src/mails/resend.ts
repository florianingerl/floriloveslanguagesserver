import axios from "axios";

// Resend is a transactional email provider: mail is sent over HTTPS with an
// API key, so no mailbox or OAuth token is needed. https://resend.com/docs
const DEFAULT_RESEND_API_URL = "https://api.resend.com/emails";

function envValue(name: string): string {
  return (process.env[name] ?? "").trim();
}

export function resendConfigured(): boolean {
  return Boolean(envValue("RESEND_API_KEY") && envValue("RESEND_FROM"));
}

export async function sendMailWithResend(
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  const apiKey = envValue("RESEND_API_KEY");
  const from = envValue("RESEND_FROM");
  if (!apiKey || !from) {
    throw new Error("Resend is not configured (RESEND_API_KEY / RESEND_FROM).");
  }

  const url = envValue("RESEND_API_URL") || DEFAULT_RESEND_API_URL;
  const timeout = Number(envValue("RESEND_TIMEOUT_MS")) || 15000;

  await axios.post(
    url,
    { from, to: [to], subject, text },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout,
    },
  );
}
