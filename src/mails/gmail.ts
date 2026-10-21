import { google } from "googleapis";

export function gmailKonfiguriert(): boolean {
  return Boolean(
    process.env.GMAIL_CLIENT_ID &&
      process.env.GMAIL_CLIENT_SECRET &&
      process.env.GMAIL_REFRESH_TOKEN &&
      process.env.GMAIL_USER,
  );
}

export function baueRohNachricht(
  an: string,
  betreff: string,
  text: string,
): string {
  const kodierterText = Buffer.from(text, "utf8").toString("base64");
  const kopfzeilen = [
    `To: ${an}`,
    `Subject: ${betreff}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    kodierterText.replace(/(.{76})/g, "$1\r\n").trimEnd(),
  ];
  return Buffer.from(kopfzeilen.join("\r\n"), "utf8").toString("base64url");
}

export async function sendeMail(
  an: string,
  betreff: string,
  text: string,
): Promise<void> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: baueRohNachricht(an, betreff, text) },
  });
}
