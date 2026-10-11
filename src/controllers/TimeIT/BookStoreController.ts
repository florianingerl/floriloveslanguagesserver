import { Response } from "express";
import { BookStore } from "../../models/LanguageLearningModel";
import { AuthenticatedRequest } from "./AuthController";
import { besitzerId } from "../../helpers/ownership";

// Ein Buchladen buendelt Buecher einer Sprach-/Fachseite. Auf der Website ist
// das zum Beispiel "Flori's German books" fuer das Fach "deutsch".

export const createBookStore = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const store = await BookStore.create({
      ...req.body,
      // Der Besitzer kommt immer aus dem Token, nie aus dem Request-Body.
      user: besitzerId(req),
    });
    res.status(201).json(store);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

// Buchlaeden auflisten, gefiltert nach subject und/oder website. Findet der
// Browser keinen Laden, kann er selbst einen anlegen.
export const getAllBookStores = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (typeof req.query.subject === "string" && req.query.subject)
      filter.subject = req.query.subject;
    if (typeof req.query.website === "string" && req.query.website)
      filter.website = req.query.website;
    const stores = await BookStore.find(filter);
    res.json(stores);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

export const getBookStoreById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const store = await BookStore.findById(req.params.id);
    if (!store) {
      res.status(404).json({ message: "BookStore not found" });
      return;
    }
    res.json(store);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};
