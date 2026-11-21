import { Request, Response } from "express";
import { Types } from "mongoose";
import { UploadedImage, User } from "../../models/LanguageLearningModel";
import { AuthenticatedRequest } from "./AuthController";
import {
  darfBildHochladen,
  hatUnbegrenztesLimit,
  MAX_UPLOADS_PRO_TAG,
  tagesBeginn,
} from "../../helpers/imageLimit";
import {
  MAX_BILD_BYTES,
  parseImageDataUrl,
} from "../../helpers/imageDataUrl";
import { validateDrawing } from "../../helpers/imageDrawing";

// Baut die absolute URL des gespeicherten Bildes. Wenn PUBLIC_URL gesetzt ist,
// wird sie benutzt; sonst die Angaben aus der Anfrage (hinter dem Proxy stehen
// Protokoll und Host in x-forwarded-proto / x-forwarded-host).
function oeffentlicheBasis(req: Request): string {
  const konfiguriert = process.env.PUBLIC_URL;
  if (konfiguriert) return konfiguriert.replace(/\/+$/, "");
  const proto = (req.header("x-forwarded-proto") ?? req.protocol)
    .split(",")[0]
    .trim();
  const host =
    req.header("x-forwarded-host") ?? req.header("host") ?? "localhost:8080";
  return `${proto}://${host}`;
}

// POST /api/image - nimmt ein Bild aus der Zwischenablage als Base64 an und
// gibt die URL zurueck, unter der es abrufbar ist.
export const uploadImage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const benutzerId = req.user?.id;
    if (!benutzerId || !Types.ObjectId.isValid(String(benutzerId))) {
      res.status(401).json({ message: "You have to be logged in to upload an image." });
      return;
    }

    const benutzer = await User.findById(benutzerId);
    const email = benutzer?.email;

    const uploadsHeute = await UploadedImage.countDocuments({
      user: new Types.ObjectId(String(benutzerId)),
      createdAt: { $gte: tagesBeginn() },
      kind: { $ne: "drawing-json" },
    });

    if (!darfBildHochladen(email, uploadsHeute)) {
      res.status(429).json({
        message: `You can upload at most ${MAX_UPLOADS_PRO_TAG} images per day.`,
      });
      return;
    }

    const datenUrl = req.body?.dataUrl;
    if (typeof datenUrl !== "string" || datenUrl.length === 0) {
      res.status(400).json({ message: "No image data was sent." });
      return;
    }

    const zerlegt = parseImageDataUrl(datenUrl);
    if (!zerlegt) {
      res.status(400).json({ message: "The pasted data is not a supported image." });
      return;
    }
    if (zerlegt.data.length > MAX_BILD_BYTES) {
      res.status(413).json({
        message: `The image is too large (max. ${Math.round(
          MAX_BILD_BYTES / (1024 * 1024)
        )} MB).`,
      });
      return;
    }

    const bild = await UploadedImage.create({
      user: new Types.ObjectId(String(benutzerId)),
      contentType: zerlegt.contentType,
      data: zerlegt.data,
    });

    const id = String(bild._id);
    const unbegrenzt = hatUnbegrenztesLimit(email);
    res.status(201).json({
      id,
      url: `${oeffentlicheBasis(req)}/api/image/${id}`,
      // -1 bedeutet: kein Tageslimit fuer diesen Benutzer.
      remaining: unbegrenzt ? -1 : Math.max(0, MAX_UPLOADS_PRO_TAG - (uploadsHeute + 1)),
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

export const uploadDrawing = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const benutzerId = req.user?.id;
    if (!benutzerId || !Types.ObjectId.isValid(String(benutzerId))) {
      res.status(401).json({ message: "You have to be logged in to upload an image." });
      return;
    }

    const benutzer = await User.findById(benutzerId);
    const email = benutzer?.email;

    const uploadsHeute = await UploadedImage.countDocuments({
      user: new Types.ObjectId(String(benutzerId)),
      createdAt: { $gte: tagesBeginn() },
      kind: { $ne: "drawing-json" },
    });
    if (!darfBildHochladen(email, uploadsHeute)) {
      res.status(429).json({
        message: `You can upload at most ${MAX_UPLOADS_PRO_TAG} images per day.`,
      });
      return;
    }

    const gueltig = validateDrawing(req.body);
    if (!gueltig.ok) {
      res.status(gueltig.status).json({ message: gueltig.message });
      return;
    }

    const user = new Types.ObjectId(String(benutzerId));
    const png = await UploadedImage.create({
      user,
      kind: "image",
      contentType: gueltig.value.contentType,
      data: gueltig.value.data,
    });
    let jsonBild;
    try {
      jsonBild = await UploadedImage.create({
        user,
        kind: "drawing-json",
        contentType: "application/json",
        data: Buffer.from(gueltig.value.json, "utf8"),
      });
    } catch (error) {
      await UploadedImage.deleteOne({ _id: png._id }).catch(() => undefined);
      throw error;
    }

    const basis = oeffentlicheBasis(req);
    const unbegrenzt = hatUnbegrenztesLimit(email);
    res.status(201).json({
      id: String(png._id),
      url: `${basis}/api/image/${String(png._id)}`,
      jsonUrl: `${basis}/api/image/${String(jsonBild._id)}`,
      remaining: unbegrenzt ? -1 : Math.max(0, MAX_UPLOADS_PRO_TAG - (uploadsHeute + 1)),
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

// GET /api/image/:id - liefert das Bild selbst. Oeffentlich, damit auch
// Besucher ohne Anmeldung die Aufgaben mit den Bildern sehen koennen.
export const getImage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const bild = await UploadedImage.findById(req.params.id);
    if (!bild) {
      res.status(404).json({ message: "Image not found" });
      return;
    }
    res.setHeader("Content-Type", bild.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(bild.data);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};
