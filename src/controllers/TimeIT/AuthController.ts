import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import dbConfig from "../../config/db.config";
import { User } from "../../models/LanguageLearningModel";
import { gmailKonfiguriert, sendeMail } from "../../mails/gmail";
import {
  CODE_GUELTIGKEIT_MS,
  erzeugeVerifizierungscode,
  frontendBestaetigungslink,
  hashVerifizierungscode,
  istCodeAbgelaufen,
  stimmtVerifizierungscodeUeberein,
  verifizierungsEmail,
} from "../../mails/verification";

const GENERIC_VERIFIZIERUNGSMELDUNG =
  "If the address is registered and not yet verified, a new verification code has been sent.";

function naechsterVerifizierungscode(): {
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

export interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    [key: string]: any; // Allows additional properties
  };
}

const AuthController = {
  // Register a new user
  async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log("Register was called!");
      const { name, email, password } = req.body;
      console.log(`Email is ${email}`);
      console.log(`Password is ${password}`);

      console.log( req.body );

      // Check if the user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({ message: `A user with the email ${email} already exists!` });
        return;
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Ohne Gmail-Konfiguration (lokale Entwicklung) wird die Adresse direkt
      // verifiziert, damit der Registrierungsfluss nicht blockiert ist.
      const mailKonfiguriert = gmailKonfiguriert();
      const verifizierung = mailKonfiguriert
        ? naechsterVerifizierungscode()
        : null;

      // Create a new user
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        isAdmin: false,
        role: "User",
        emailVerified: !mailKonfiguriert,
        ...(verifizierung
          ? {
              verificationCodeHash: verifizierung.hash,
              verificationExpiresAt: verifizierung.ablauf,
            }
          : {}),
      });

      const createdUser = await newUser.save();

      if (verifizierung) {
        try {
          const { betreff, text } = verifizierungsEmail(
            name,
            verifizierung.code,
            frontendBestaetigungslink(email),
          );
          await sendeMail(email, betreff, text);
        } catch (mailFehler) {
          console.error(
            "Die Verifizierungs-E-Mail konnte nicht gesendet werden:",
            (mailFehler as Error).message,
          );
        }
      } else {
        console.log(
          `Gmail ist nicht konfiguriert: ${email} wurde ohne E-Mail-Verifizierung registriert.`,
        );
      }

      // Optionally, generate a token right after registration
      const token = jwt.sign({ id: createdUser._id }, dbConfig.JWT_SECRET, {
        expiresIn: "1h",
      });

      const userObj = createdUser.toObject() as unknown as Record<
        string,
        unknown
      >;
      delete userObj.verificationCodeHash;
      delete userObj.verificationExpiresAt;

      res.status(201).json({
        message: "User registered successfully",
        user: userObj,
        token, // Return the token with the user data
      });
    } catch (err) {
      res.status(500).json({
        message: "Error registering user",
        error: (err as Error).message,
      });
    }
  },

  // Log in a user
  async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log("Login endpoint was called!");
      const { email, password } = req.body;
      console.log(`Email is ${email}`);
      console.log(`Password is ${password}`);
      console.log( req.body );

      // Check if the user exists
      const user = await User.findOne({ email });
      console.log("The user wasn't found!");
      if (!user) {
        res.status(400).json({ message: "User does not exist" });
        return;
      }

      // Check if the password is correct
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(400).json({ message: "Invalid credentials" });
        return;
      }

      // Noch nicht verifizierte Adressen duerfen sich nicht anmelden.
      // Bestehende Benutzer ohne das Feld gelten als verifiziert.
      if (user.emailVerified === false) {
        res.status(403).json({
          message:
            "Please verify your email address first. Check your inbox for the verification link.",
        });
        return;
      }

      // Generate a JWT token
      const token = jwt.sign({ id: user._id }, dbConfig.JWT_SECRET, {
        expiresIn: "1h", // Token expires in 1 hour
      });

      res.status(200).json({ message: "Login successful", token, user });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error logging in", error: (err as Error).message });
    }
  },

  // Get the authenticated user's information
  async getAuthenticatedUser(
    req: AuthenticatedRequest, // Verwende AuthenticatedRequest hier
    res: Response
  ): Promise<void> {
    try {
      const user = await User.findById(req.user?.id).select("-password"); // Do not return password
      res.status(200).json(user);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error getting user", error: (err as Error).message });
    }
  },

  // Verify an email address with the one-time code from the signup email
  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email, code } = req.body;
      if (
        typeof email !== "string" ||
        typeof code !== "string" ||
        !email.trim() ||
        !code.trim()
      ) {
        res.status(400).json({ message: "Email and code are required." });
        return;
      }

      const user = await User.findOne({ email: email.trim() });
      if (!user) {
        res.status(400).json({ message: "Unknown email address." });
        return;
      }

      if (user.emailVerified !== false) {
        res
          .status(200)
          .json({ message: "The email address is already verified." });
        return;
      }

      if (
        !user.verificationCodeHash ||
        istCodeAbgelaufen(user.verificationExpiresAt)
      ) {
        res.status(400).json({
          message: "The code has expired. Please request a new one.",
        });
        return;
      }

      if (!stimmtVerifizierungscodeUeberein(code.trim(), user.verificationCodeHash)) {
        res.status(400).json({ message: "The code is not correct." });
        return;
      }

      user.emailVerified = true;
      user.verificationCodeHash = undefined;
      user.verificationExpiresAt = undefined;
      await user.save();

      res.status(200).json({
        message: "Your email address has been verified. You can log in now.",
      });
    } catch (err) {
      res.status(500).json({
        message: "Error verifying email",
        error: (err as Error).message,
      });
    }
  },

  // Send a new verification code for an unverified address
  async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (typeof email !== "string" || !email.trim()) {
        res.status(400).json({ message: "Email is required." });
        return;
      }

      const user = await User.findOne({ email: email.trim() });
      if (!user) {
        res.status(200).json({ message: GENERIC_VERIFIZIERUNGSMELDUNG });
        return;
      }

      if (user.emailVerified !== false) {
        res
          .status(200)
          .json({ message: "The email address is already verified." });
        return;
      }

      if (!gmailKonfiguriert()) {
        res.status(200).json({ message: GENERIC_VERIFIZIERUNGSMELDUNG });
        return;
      }

      const verifizierung = naechsterVerifizierungscode();
      user.verificationCodeHash = verifizierung.hash;
      user.verificationExpiresAt = verifizierung.ablauf;
      await user.save();

      try {
        const { betreff, text } = verifizierungsEmail(
          user.name,
          verifizierung.code,
          frontendBestaetigungslink(user.email),
        );
        await sendeMail(user.email, betreff, text);
      } catch (mailFehler) {
        console.error(
          "Die Verifizierungs-E-Mail konnte nicht gesendet werden:",
          (mailFehler as Error).message,
        );
        res.status(500).json({
          message: "The email couldn't be sent. Please try again later.",
        });
        return;
      }

      res.status(200).json({ message: GENERIC_VERIFIZIERUNGSMELDUNG });
    } catch (err) {
      res.status(500).json({
        message: "Error resending verification email",
        error: (err as Error).message,
      });
    }
  },
};

// // Middleware to protect routes and get the authenticated user
// const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1];

//   if (token == null) {
//     res.sendStatus(401); // If no token
//     return;
//   }

//   jwt.verify(token, dbConfig.JWT_SECRET, (err, user) => {
//     if (err) {
//       res.sendStatus(403); // If token is invalid
//       return;
//     }
//     req.user = user as { id: string };
//     next();
//   });
// };

export { AuthController };
