import { Response } from "express";
import { School } from "../../models/LanguageLearningModel";
import { AuthenticatedRequest } from "./AuthController";

// Schulen/Hochschulen/Klassen, aus denen das Formular beim Anlegen einer
// Aufgabe die Schule auswaehlt. Lesen bleibt frei (wie bei den Themen),
// damit Besucher ohne Anmeldung die Aufgaben filtern koennen; angelegt
// wird nur mit einem gueltigen Token.

export const getAllSchools = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const schools = await School.find().sort({ name: 1 });
    res.json(schools);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

export const createSchool = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const name =
      typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!name) {
      res.status(400).json({ message: "A school needs a name!" });
      return;
    }
    // Derselbe Name zweimal: das vorhandene Dokument zurueckgeben. So
    // entstehen keine Duplikate und die Auswahl funktioniert trotzdem.
    const vorhanden = await School.findOne({ name });
    if (vorhanden) {
      res.json(vorhanden);
      return;
    }
    const school = await School.create({ name });
    res.status(201).json(school);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};
