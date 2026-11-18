import assert from "assert";
import {
  createStateToken,
  frontendBaseUrl,
  githubAuthorizeUrl,
  googleAuthorizeUrl,
  isOAuthConfigured,
  oauthCallbackUrl,
  oauthErrorRedirectUrl,
  oauthSuccessRedirectUrl,
  sanitizeReturnTo,
  verifyStateToken,
} from "./oauth";

const OAUTH_ENV_VARS = [
  "FRONTEND_URL",
  "SERVER_PUBLIC_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "OAUTH_ALLOWED_REDIRECT_ORIGINS",
];

function runTests(): void {
  const original = Object.fromEntries(
    OAUTH_ENV_VARS.map((name) => [name, process.env[name]]),
  );

  try {
    for (const name of OAUTH_ENV_VARS) delete process.env[name];
    process.env.FRONTEND_URL = "https://florianingerl.github.io";

    assert.strictEqual(frontendBaseUrl(), "https://florianingerl.github.io");
    assert.strictEqual(isOAuthConfigured("google"), false);
    assert.strictEqual(isOAuthConfigured("github"), false);

    process.env.GOOGLE_CLIENT_ID = "google-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";
    process.env.GITHUB_CLIENT_ID = "github-id";
    process.env.GITHUB_CLIENT_SECRET = "github-secret";
    assert.strictEqual(isOAuthConfigured("google"), true);
    assert.strictEqual(isOAuthConfigured("github"), true);

    // returnTo: relative paths and the configured frontend are allowed.
    assert.strictEqual(sanitizeReturnTo(undefined), undefined);
    assert.strictEqual(sanitizeReturnTo(""), undefined);
    assert.strictEqual(sanitizeReturnTo("/whiteboard"), "/whiteboard");
    assert.strictEqual(
      sanitizeReturnTo("https://florianingerl.github.io/#franzoesisch?topic=x"),
      "https://florianingerl.github.io/#franzoesisch?topic=x",
    );
    assert.strictEqual(sanitizeReturnTo("https://evil.example/#x"), null);
    assert.strictEqual(sanitizeReturnTo("javascript:alert(1)"), null);
    assert.strictEqual(sanitizeReturnTo("//evil.example"), null);

    process.env.OAUTH_ALLOWED_REDIRECT_ORIGINS = "https://preview.example";
    assert.strictEqual(
      sanitizeReturnTo("https://preview.example/quiz"),
      "https://preview.example/quiz",
    );

    // The signed state keeps the provider and the returnTo value.
    const state = createStateToken(
      "google",
      "https://florianingerl.github.io/#franzoesisch",
    );
    const decoded = verifyStateToken(state);
    assert.ok(decoded);
    assert.strictEqual(decoded?.provider, "google");
    assert.strictEqual(
      decoded?.returnTo,
      "https://florianingerl.github.io/#franzoesisch",
    );
    assert.ok((decoded?.nonce.length ?? 0) >= 32, "nonce muss zufaellig sein");
    assert.strictEqual(verifyStateToken(`${state}x`), null);
    assert.strictEqual(verifyStateToken(undefined), null);
    assert.strictEqual(verifyStateToken("kein-jwt"), null);

    const callback = oauthCallbackUrl(
      "google",
      "https",
      "14ofbe9.cserverhost.cloud",
    );
    assert.strictEqual(
      callback,
      "https://14ofbe9.cserverhost.cloud/api/auth/google/callback",
    );

    process.env.SERVER_PUBLIC_URL = "https://api.example/";
    assert.strictEqual(
      oauthCallbackUrl("github", "http", "ignored"),
      "https://api.example/api/auth/github/callback",
    );

    const googleUrl = googleAuthorizeUrl("https", "api.example", state);
    const googleParams = new URL(googleUrl).searchParams;
    assert.strictEqual(googleParams.get("client_id"), "google-id");
    assert.strictEqual(
      googleParams.get("redirect_uri"),
      "https://api.example/api/auth/google/callback",
    );
    assert.strictEqual(googleParams.get("state"), state);

    const githubUrl = githubAuthorizeUrl("https", "api.example", state);
    const githubParams = new URL(githubUrl).searchParams;
    assert.strictEqual(githubParams.get("client_id"), "github-id");
    assert.strictEqual(
      githubParams.get("redirect_uri"),
      "https://api.example/api/auth/github/callback",
    );
    assert.strictEqual(githubParams.get("scope"), "read:user user:email");

    const errorUrl = new URL(oauthErrorRedirectUrl("kaputt & weg"));
    assert.strictEqual(errorUrl.origin, "https://florianingerl.github.io");
    assert.strictEqual(errorUrl.pathname, "/oauth-callback");
    assert.strictEqual(errorUrl.searchParams.get("error"), "kaputt & weg");

    const successUrl = new URL(
      oauthSuccessRedirectUrl("jwt-token", "/whiteboard"),
    );
    assert.strictEqual(successUrl.searchParams.get("token"), "jwt-token");
    assert.strictEqual(successUrl.searchParams.get("returnTo"), "/whiteboard");

    console.log("Alle Tests fuer den OAuth-Login bestanden.");
  } finally {
    for (const name of OAUTH_ENV_VARS) delete process.env[name];
    for (const name of OAUTH_ENV_VARS) {
      const value = original[name];
      if (value !== undefined) process.env[name] = value;
    }
  }
}

runTests();
