import assert from "assert";
import { activeMailProvider, mailConfigured } from "./mailer";

const MAIL_ENV_VARS = [
  "RESEND_API_KEY",
  "RESEND_FROM",
  "GMAIL_USER",
  "GMAIL_CLIENT_ID",
  "GMAIL_CLIENT_SECRET",
  "GMAIL_REFRESH_TOKEN",
];

function clearMailEnv(): void {
  for (const name of MAIL_ENV_VARS) delete process.env[name];
}

function runTests(): void {
  const original = Object.fromEntries(
    MAIL_ENV_VARS.map((name) => [name, process.env[name]]),
  );

  try {
    clearMailEnv();
    assert.strictEqual(mailConfigured(), false);
    assert.strictEqual(activeMailProvider(), null);

    process.env.GMAIL_USER = "me@example.com";
    process.env.GMAIL_CLIENT_ID = "client-id";
    process.env.GMAIL_CLIENT_SECRET = "client-secret";
    process.env.GMAIL_REFRESH_TOKEN = "refresh-token";
    assert.strictEqual(activeMailProvider(), "gmail");

    // Resend wins as soon as it is configured, but Gmail keeps working.
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM = "Frag Florian <noreply@example.com>";
    assert.strictEqual(activeMailProvider(), "resend");
    assert.strictEqual(mailConfigured(), true);

    // An incomplete Resend configuration must not hide a working Gmail setup.
    delete process.env.RESEND_FROM;
    assert.strictEqual(activeMailProvider(), "gmail");

    console.log("Alle Tests fuer die Mail-Anbieter-Auswahl bestanden.");
  } finally {
    clearMailEnv();
    for (const name of MAIL_ENV_VARS) {
      const value = original[name];
      if (value !== undefined) process.env[name] = value;
    }
  }
}

runTests();
