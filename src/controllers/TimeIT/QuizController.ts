import { Response } from "express";
import { Quiz } from "../../models/LanguageLearningModel";
import { AuthenticatedRequest } from "./AuthController";
import { besitzerId } from "../../helpers/ownership";

// Ein Quiz gehoert entweder zu einer Website ("web", die Sprach-/Fachseiten)
// oder zu einem Buch ("book"). Es verknuepft Aufgaben (Exercise.quiz) und
// Themen (Topic.subject) mit einer Sprache oder einem Fach.

export const createQuiz = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const quiz = await Quiz.create({
      website: req.body.website ?? "book",
      book: req.body.book,
      // Alte Aufrufe schicken "subject", neu heisst das Feld "language".
      language: req.body.language ?? req.body.subject ?? "",
      name: req.body.name,
      // Der Besitzer kommt immer aus dem Token, nie aus dem Request-Body.
      user: besitzerId(req),
    });
    res.status(201).json(quiz);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

export const getQuizById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      res.status(404).json({ message: "Quiz not found" });
      return;
    }
    res.json(quiz);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};