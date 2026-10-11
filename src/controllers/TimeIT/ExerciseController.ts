import { Response } from "express";
import { Types } from "mongoose";
import { Exercise, Quiz } from "../../models/LanguageLearningModel";
import { AuthenticatedRequest } from "./AuthController";
import {
  besitzer as besitzerVon,
  besitzerId,
  besitzPruefen,
} from "../../helpers/ownership";

// Eine quiz-Angabe kann eine 24-stellige Mongo-Id sein (neu) oder der Name
// eines Website-Quizzes (alt, z.B. "deutsch"). Aus dem Namen wird die Id des
// passenden Quiz-Dokuments gesucht, damit auch alte Aufrufe weiter funktionieren.
async function quizIdAus(wert: unknown): Promise<Types.ObjectId> {
  if (typeof wert === "string" && /^[0-9a-fA-F]{24}$/.test(wert)) {
    return new Types.ObjectId(wert);
  }
  const quiz = await Quiz.findOne({ website: "web", name: String(wert ?? "") });
  if (!quiz?._id) throw new Error(`Unknown quiz "${wert}"`);
  return new Types.ObjectId(String(quiz._id));
}

// controllers/userController.js
export const createExercise = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const quizId = await quizIdAus(req.body.quiz);
    const quiz = await Quiz.findById(quizId);
    const exercise = await Exercise.create({
      ...req.body,
      quiz: quizId,
      language: req.body.language ?? quiz?.language,
      // Der Besitzer kommt immer aus dem Token, nie aus dem Request-Body.
      user: besitzerId(req),
    });
    res.status(201).json(exercise);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

export const getAllExercises = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    let filter: Record<string, unknown> = {};
    const quiz = req.query.quiz;
    if (typeof quiz === "string" && quiz) {
      if (/^[0-9a-fA-F]{24}$/.test(quiz)) {
        filter = { quiz: new Types.ObjectId(quiz) };
      } else {
        const gefunden = await Quiz.findOne({ website: "web", name: quiz });
        // Unbekannte Quiz-Namen liefern keine Aufgaben, sondern eine leere Liste.
        if (!gefunden?._id) filter = { quiz: new Types.ObjectId() };
        else filter = { quiz: gefunden._id };
      }
    }
    const exercises = await Exercise.find(filter);
    res.json(exercises);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

export const getExerciseById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) {
      res.status(404).json({ message: "Exercise not found" });
      return;
    }
    res.json(exercise);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};


export const updateExercise = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const vorhanden = await Exercise.findById(req.params.id);
    if (!vorhanden) {
      res.status(404).json({ message: "Exercise not found" });
      return;
    }
    if (!besitzPruefen(req, res, vorhanden.user, "exercise")) {
      return;
    }

    const daten: Record<string, unknown> = { ...req.body };
    if (daten.quiz !== undefined) daten.quiz = await quizIdAus(daten.quiz);

    const exercise = await Exercise.findByIdAndUpdate(
      req.params.id,
      { ...daten, user: besitzerVon(req, vorhanden.user) },
      {
        new: true,
        runValidators: true,
      }
    );
    if (!exercise) {
      res.status(404).json({ message: "Exercise not found" });
      return;
    }
    res.json(exercise);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

export const deleteExercise = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const vorhanden = await Exercise.findById(req.params.id);
    if (!vorhanden) {
      res.status(404).json({ message: "Exercise not found" });
      return;
    }
    if (!besitzPruefen(req, res, vorhanden.user, "exercise")) {
      return;
    }

    await Exercise.findByIdAndDelete(req.params.id);
    res.json({ message: "Exercise deleted" });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};
