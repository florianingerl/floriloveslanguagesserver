import { Response } from "express";
import { Exercise } from "../../models/LanguageLearningModel";
import { AuthenticatedRequest } from "./AuthController";
import {
  besitzer as besitzerVon,
  besitzerId,
  besitzPruefen,
} from "../../helpers/ownership";

// controllers/userController.js
export const createExercise = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const exercise = await Exercise.create({
      ...req.body,
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
    const filter =
      typeof req.query.quiz === "string" ? { quiz: req.query.quiz } : {};
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

    const exercise = await Exercise.findByIdAndUpdate(
      req.params.id,
      { ...req.body, user: besitzerVon(req, vorhanden.user) },
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
