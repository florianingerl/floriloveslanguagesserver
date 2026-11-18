import axios from "axios";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import dbConfig from "../../config/db.config";
import { User } from "../../models/LanguageLearningModel";
import {
  OAuthProvider,
  createStateToken,
  githubAuthorizeUrl,
  googleAuthorizeUrl,
  isOAuthConfigured,
  oauthCallbackUrl,
  oauthErrorRedirectUrl,
  oauthSuccessRedirectUrl,
  sanitizeReturnTo,
  verifyStateToken,
} from "../../oauth/oauth";

interface OAuthProfile {
  id: string;
  email?: string;
  name?: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

function githubHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "floriloveslanguages",
  };
}

async function fetchGoogleProfile(
  code: string,
  protocol: string,
  host: string,
): Promise<OAuthProfile> {
  const tokenResponse = await axios.post<{ access_token?: string }>(
    "https://oauth2.googleapis.com/token",
    new URLSearchParams({
      code,
      client_id: (process.env.GOOGLE_CLIENT_ID ?? "").trim(),
      client_secret: (process.env.GOOGLE_CLIENT_SECRET ?? "").trim(),
      redirect_uri: oauthCallbackUrl("google", protocol, host),
      grant_type: "authorization_code",
    }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );

  const accessToken = tokenResponse.data.access_token;
  if (!accessToken) {
    throw new Error("Google did not return an access token.");
  }

  const profileResponse = await axios.get<{
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  }>("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileResponse.data.email || profileResponse.data.email_verified !== true) {
    throw new Error("Google did not confirm the email address.");
  }

  return {
    id: String(profileResponse.data.sub),
    email: profileResponse.data.email,
    name: profileResponse.data.name,
  };
}

async function fetchGitHubProfile(
  code: string,
  protocol: string,
  host: string,
): Promise<OAuthProfile> {
  const tokenResponse = await axios.post<{
    access_token?: string;
    error?: string;
  }>(
    "https://github.com/login/oauth/access_token",
    {
      code,
      client_id: (process.env.GITHUB_CLIENT_ID ?? "").trim(),
      client_secret: (process.env.GITHUB_CLIENT_SECRET ?? "").trim(),
      redirect_uri: oauthCallbackUrl("github", protocol, host),
    },
    { headers: { Accept: "application/json" } },
  );

  const accessToken = tokenResponse.data.access_token;
  if (!accessToken) {
    throw new Error(
      tokenResponse.data.error || "GitHub did not return an access token.",
    );
  }

  const userResponse = await axios.get<{
    id: number;
    login: string;
    name?: string | null;
    email?: string | null;
  }>("https://api.github.com/user", { headers: githubHeaders(accessToken) });

  let email = userResponse.data.email ?? undefined;
  if (!email) {
    const emailsResponse = await axios.get<GitHubEmail[]>(
      "https://api.github.com/user/emails",
      { headers: githubHeaders(accessToken) },
    );
    const verified =
      emailsResponse.data.find((entry) => entry.primary && entry.verified) ??
      emailsResponse.data.find((entry) => entry.verified);
    email = verified?.email;
  }

  return {
    id: String(userResponse.data.id),
    email,
    name: userResponse.data.name ?? userResponse.data.login,
  };
}

async function findOrCreateUser(
  profile: OAuthProfile & { email: string },
  provider: OAuthProvider,
) {
  const existing = await User.findOne({ email: profile.email });

  if (existing) {
    let changed = false;
    if (provider === "google" && !existing.googleId) {
      existing.googleId = profile.id;
      changed = true;
    }
    if (provider === "github" && !existing.githubId) {
      existing.githubId = profile.id;
      changed = true;
    }
    // A successful OAuth login proves ownership of the address.
    if (existing.emailVerified === false) {
      existing.emailVerified = true;
      existing.verificationCodeHash = undefined;
      existing.verificationExpiresAt = undefined;
      changed = true;
    }
    if (changed) await existing.save();
    return existing;
  }

  const randomPassword = crypto.randomBytes(32).toString("hex");
  const password = await bcrypt.hash(randomPassword, 10);

  return User.create({
    name: profile.name?.trim() || profile.email.split("@")[0],
    email: profile.email,
    password,
    role: "User",
    isAdmin: false,
    emailVerified: true,
    ...(provider === "google"
      ? { googleId: profile.id }
      : { githubId: profile.id }),
  });
}

export const OAuthController = {
  getProviders(_req: Request, res: Response): void {
    res.json({
      google: isOAuthConfigured("google"),
      github: isOAuthConfigured("github"),
    });
  },

  start(provider: OAuthProvider) {
    return (req: Request, res: Response): void => {
      if (!isOAuthConfigured(provider)) {
        res.status(503).json({
          message: `${provider} login is not configured on the server.`,
        });
        return;
      }

      const returnTo = sanitizeReturnTo(req.query.returnTo);
      if (returnTo === null) {
        res.status(400).json({ message: "Invalid returnTo URL." });
        return;
      }

      const state = createStateToken(provider, returnTo);
      const protocol = req.protocol;
      const host = req.get("host") ?? "localhost";
      const target =
        provider === "google"
          ? googleAuthorizeUrl(protocol, host, state)
          : githubAuthorizeUrl(protocol, host, state);

      res.redirect(target);
    };
  },

  callback(provider: OAuthProvider) {
    return async (req: Request, res: Response): Promise<void> => {
      try {
        if (typeof req.query.error === "string") {
          res.redirect(oauthErrorRedirectUrl(req.query.error));
          return;
        }

        const state = verifyStateToken(
          typeof req.query.state === "string" ? req.query.state : undefined,
        );
        const code = typeof req.query.code === "string" ? req.query.code : "";
        if (!state || state.provider !== provider || !code) {
          res.redirect(
            oauthErrorRedirectUrl(
              "Invalid OAuth response. Please try signing in again.",
            ),
          );
          return;
        }

        const protocol = req.protocol;
        const host = req.get("host") ?? "localhost";
        const profile =
          provider === "google"
            ? await fetchGoogleProfile(code, protocol, host)
            : await fetchGitHubProfile(code, protocol, host);

        const email = profile.email?.trim().toLowerCase();
        if (!email) {
          res.redirect(
            oauthErrorRedirectUrl(
              "The provider did not return an email address.",
            ),
          );
          return;
        }

        const user = await findOrCreateUser({ ...profile, email }, provider);
        const token = jwt.sign({ id: user._id }, dbConfig.JWT_SECRET, {
          expiresIn: "1h",
        });

        res.redirect(oauthSuccessRedirectUrl(token, state.returnTo));
      } catch (error) {
        console.error("OAuth callback failed:", error);
        res.redirect(
          oauthErrorRedirectUrl(
            error instanceof Error ? error.message : "OAuth login failed.",
          ),
        );
      }
    };
  },
};
