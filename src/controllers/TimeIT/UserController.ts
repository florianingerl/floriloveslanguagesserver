import bcrypt from "bcryptjs";
import { Response } from "express";
import { User } from "../../models/LanguageLearningModel";
import { gmailKonfiguriert, sendeMail } from "../../mails/gmail";
import {
  CODE_GUELTIGKEIT_MS,
  erzeugeVerifizierungscode,
  frontendBestaetigungslink,
  hashVerifizierungscode,
  verifizierungsEmail,
} from "../../mails/verification";
import { AuthenticatedRequest } from "./AuthController";

const ERLAUBTE_BENUTZERFELDER = ["name", "email", "quizSettings"] as const;

function erstelleVerifizierung(): {
  hash: string;
  ablauf: Date;
  code: string;
} {
  const code = erzeugeVerifizierungscode();
  return {
    code,
    hash: hashVerifizierungscode(code),
    ablauf: new Date(Date.now() + CODE_GUELTIGKEIT_MS),
  };
}

// controllers/userController.js
export const createUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.create({
      ...req.body,
      isAdmin: false,
      role: "User",
    });
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

export const getAllUsers = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

export const getUserById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(user);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};


export const updateUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const benutzerId = req.user?.id;
    if (!benutzerId) {
      res.status(401).json({ message: "No token, authorization denied" });
      return;
    }
    if (benutzerId !== req.params.id) {
      res.status(403).json({ message: "You can only update your own profile." });
      return;
    }

    const existierenderBenutzer = await User.findById(benutzerId);
    if (!existierenderBenutzer) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    if (existierenderBenutzer.isAdmin) {
      res.status(403).json({ message: "Admins are not allowed to edit their profile." });
      return;
    }

    const aktualisierung: Record<string, unknown> = {};
    const body = req.body as Record<string, unknown>;

    if (typeof body.name === "string") {
      aktualisierung.name = body.name.trim();
    }
    if (typeof body.email === "string") {
      const neueEmail = body.email.trim().toLowerCase();
      if (neueEmail && neueEmail !== existierenderBenutzer.email.toLowerCase()) {
        const emailBelegt = await User.findOne({
          email: neueEmail,
          _id: { $ne: benutzerId },
        });
        if (emailBelegt) {
          res.status(400).json({ message: "This email address is already in use." });
          return;
        }
        const verifizierung = erstelleVerifizierung();
        aktualisierung.email = neueEmail;
        aktualisierung.emailVerified = false;
        aktualisierung.verificationCodeHash = verifizierung.hash;
        aktualisierung.verificationExpiresAt = verifizierung.ablauf;
        if (gmailKonfiguriert()) {
          try {
            await sendeMail(
              neueEmail,
              verifizierungsEmail(existierenderBenutzer.name, verifizierung.code, frontendBestaetigungslink(neueEmail)).text,
              verifizierungsEmail(existierenderBenutzer.name, verifizierung.code, frontendBestaetigungslink(neueEmail)).betreff
            );
          } catch {
            // Die E-Mail wird bestmöglich versucht, blockiert aber nicht das Speichern.
          }
        }
      }
    }
    if (body.quizSettings && typeof body.quizSettings === "object") {
      const einstellungen = body.quizSettings as Record<string, unknown>;
      if (einstellungen.gapReadMode === "gap" || einstellungen.gapReadMode === "whole") {
        aktualisierung.quizSettings = {
          gapReadMode: einstellungen.gapReadMode,
        };
      }
    }

    if (Object.keys(aktualisierung).length === 0) {
      res.json(existierenderBenutzer);
      return;
    }

    aktualisierung.updatedAt = new Date();

    const user = await User.findByIdAndUpdate(benutzerId, aktualisierung, {
      new: true,
      runValidators: true,
    }).select("-password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(user);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

export const deleteUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({ message: "User deleted" });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};
