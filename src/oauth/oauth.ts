import crypto from "crypto";
import jwt from "jsonwebtoken";
import dbConfig from "../config/db.config";

export type OAuthProvider = "google" | "github";

export interface OAuthStatePayload {
  provider: OAuthProvider;
  returnTo?: string;
  nonce: string;
}

const STATE_VALIDITY = "10m";
const DEFAULT_FRONTEND_URL = "https://florianingerl.github.io";

function envValue(name: string): string {
  return (process.env[name] ?? "").trim();
}

export function isOAuthConfigured(provider: OAuthProvider): boolean {
  if (provider === "google") {
    return Boolean(envValue("GOOGLE_CLIENT_ID") && envValue("GOOGLE_CLIENT_SECRET"));
  }
  return Boolean(envValue("GITHUB_CLIENT_ID") && envValue("GITHUB_CLIENT_SECRET"));
}

export function frontendBaseUrl(): string {
  return (envValue("FRONTEND_URL") || DEFAULT_FRONTEND_URL).replace(/\/+$/, "");
}

// The callback URL must be reachable from the provider. On production it is
// e.g. https://14ofbe9.cserverhost.cloud/api/auth/google/callback. Locally the
// server falls back to the request's protocol/host.
export function serverBaseUrl(protocol: string, host: string): string {
  const configured = envValue("SERVER_PUBLIC_URL").replace(/\/+$/, "");
  if (configured) return configured;
  return `${protocol || "http"}://${host}`.replace(/\/+$/, "");
}

export function oauthCallbackUrl(
  provider: OAuthProvider,
  protocol: string,
  host: string,
): string {
  return `${serverBaseUrl(protocol, host)}/api/auth/${provider}/callback`;
}

function allowedRedirectOrigins(): string[] {
  const extra = envValue("OAUTH_ALLOWED_REDIRECT_ORIGINS")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return [frontendBaseUrl(), ...extra];
}

function isAllowedReturnTo(returnTo: string): boolean {
  // A path on the same frontend is always fine ("/whiteboard", ...).
  if (returnTo.startsWith("/") && !returnTo.startsWith("//")) return true;
  try {
    const target = new URL(returnTo);
    if (target.protocol !== "http:" && target.protocol !== "https:") return false;
    return allowedRedirectOrigins().some((origin) => {
      try {
        return new URL(origin).origin === target.origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

// Returns undefined when no returnTo was given, null when it is not allowed.
export function sanitizeReturnTo(
  returnTo: unknown,
): string | undefined | null {
  if (returnTo === undefined || returnTo === null || returnTo === "") {
    return undefined;
  }
  if (typeof returnTo !== "string") return null;
  return isAllowedReturnTo(returnTo) ? returnTo : null;
}

// The state is a short-lived signed JWT, so no server-side session storage is
// needed. It also carries the page the user should return to after login.
export function createStateToken(
  provider: OAuthProvider,
  returnTo?: string,
): string {
  const payload: OAuthStatePayload = {
    provider,
    returnTo,
    nonce: crypto.randomBytes(16).toString("hex"),
  };
  return jwt.sign(payload, dbConfig.JWT_SECRET, { expiresIn: STATE_VALIDITY });
}

export function verifyStateToken(
  state: string | undefined,
): OAuthStatePayload | null {
  if (!state) return null;
  try {
    const decoded = jwt.verify(state, dbConfig.JWT_SECRET);
    if (typeof decoded !== "object" || decoded === null) return null;
    const payload = decoded as Partial<OAuthStatePayload>;
    if (
      (payload.provider !== "google" && payload.provider !== "github") ||
      typeof payload.nonce !== "string"
    ) {
      return null;
    }
    return {
      provider: payload.provider,
      returnTo:
        typeof payload.returnTo === "string" ? payload.returnTo : undefined,
      nonce: payload.nonce,
    };
  } catch {
    return null;
  }
}

export function googleAuthorizeUrl(
  protocol: string,
  host: string,
  state: string,
): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", envValue("GOOGLE_CLIENT_ID"));
  url.searchParams.set(
    "redirect_uri",
    oauthCallbackUrl("google", protocol, host),
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export function githubAuthorizeUrl(
  protocol: string,
  host: string,
  state: string,
): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", envValue("GITHUB_CLIENT_ID"));
  url.searchParams.set(
    "redirect_uri",
    oauthCallbackUrl("github", protocol, host),
  );
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", state);
  return url.toString();
}

export function oauthErrorRedirectUrl(message: string): string {
  const url = new URL(`${frontendBaseUrl()}/oauth-callback`);
  url.searchParams.set("error", message);
  return url.toString();
}

export function oauthSuccessRedirectUrl(
  token: string,
  returnTo?: string,
): string {
  const url = new URL(`${frontendBaseUrl()}/oauth-callback`);
  url.searchParams.set("token", token);
  if (returnTo) url.searchParams.set("returnTo", returnTo);
  return url.toString();
}
