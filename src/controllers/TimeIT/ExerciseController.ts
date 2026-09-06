import { Response } from "express";
import { Exercise } from "../../models/LanguageLearningModel";
import { AuthenticatedRequest } from "./AuthController";

// controllers/userController.js
export const createExercise = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await Exercise.create({
      ...req.body,
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
    const exercise = await Exercise.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!exercise) {
      res.status(404).json({ message: "User not found" });
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
    const exercise = await Exercise.findByIdAndDelete(req.params.id);
    if (!exercise) {
      res.status(404).json({ message: "Exercise not found" });
      return;
    }
    res.json({ message: "Exercise deleted" });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};
