import { Response } from "express";
import { Types } from "mongoose";
import { AuthenticatedRequest } from "../controllers/TimeIT/AuthController";

// Vergleicht den Besitzer eines Dokuments mit dem Benutzer aus dem Token.
// Das Feld kann je nach Collection ein ObjectId oder eine Zeichenkette sein,
// deshalb wird alles ueber String verglichen.
export function gehoertDemBenutzer(
  besitzer: unknown,
  benutzerId: string | undefined
): boolean {
  if (!besitzer || !benutzerId) return false;
  return String(besitzer) === String(benutzerId);
}

// Holt die Benutzer-ID aus dem Token. authMiddleware laeuft vorher, deshalb
// sollte sie immer dastehen.
export function benutzerId(req: AuthenticatedRequest): string | undefined {
  return req.user?.id ? String(req.user.id) : undefined;
}

// Antwortet mit 403, wenn das Dokument einem anderen Benutzer gehoert, und
// gibt dann false zurueck, damit der Controller abbrechen kann. Ein Dokument
// ohne Besitzer (Altbestand vor der Migration) wird durchgelassen und vom
// aufrufenden Benutzer uebernommen.
export function besitzPruefen(
  req: AuthenticatedRequest,
  res: Response,
  besitzer: unknown,
  art: string
): boolean {
  if (!besitzer) return true;
  if (gehoertDemBenutzer(besitzer, benutzerId(req))) return true;

  res.status(403).json({
    message: `This ${art} belongs to someone else, so you can't change it.`,
  });
  return false;
}

// Der Besitzer, der gespeichert wird: der vorhandene bleibt, ein Dokument ohne
// Besitzer wird dem aufrufenden Benutzer zugeschrieben.
export function besitzer(
  req: AuthenticatedRequest,
  vorhandenerBesitzer: unknown
): Types.ObjectId | undefined {
  if (vorhandenerBesitzer) return vorhandenerBesitzer as Types.ObjectId;
  return besitzerId(req);
}

// ObjectId fuer den Besitzer. Fehlt der Token, kann es keinen Besitzer geben.
export function besitzerId(req: AuthenticatedRequest): Types.ObjectId | undefined {
  const id = benutzerId(req);
  if (!id || !Types.ObjectId.isValid(id)) return undefined;
  return new Types.ObjectId(id);
}
