import { Response } from "express";
import { Types } from "mongoose";
import { Quiz } from "../../models/LanguageLearningModel";
import { AuthenticatedRequest } from "./AuthController";
import { besitzerId } from "../../helpers/ownership";

// Ein Quiz gehoert entweder zu einer Website ("web", die Sprach-/Fachseiten)
// oder zu einem Buch ("book"). Es verknuepft Aufgaben (Exercise.quiz) und
// Themen (Topic.quiz) mit einer Sprache oder einem Fach (subject).

export const createQuiz = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const quiz = await Quiz.create({
      website: req.body.website ?? "book",
      book: req.body.book,
      // Alte Aufrufe schicken "language", neu heisst das Feld "subject".
      subject: req.body.subject ?? req.body.language ?? "",
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

// Quizze auflisten, gefiltert nach website, subject und/oder book. Der Browser
// fragt damit zum Beispiel das Website-Quiz einer Sprachseite ab
// (GET /api/quiz?website=web&subject=deutsch), um seine _id zu erfahren.
export const getQuizzes = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (typeof req.query.website === "string" && req.query.website)
      filter.website = req.query.website;
    if (typeof req.query.subject === "string" && req.query.subject)
      filter.subject = req.query.subject;
    if (typeof req.query.book === "string" && req.query.book)
      filter.book = new Types.ObjectId(req.query.book);
    const quizzes = await Quiz.find(filter);
    res.json(quizzes);
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