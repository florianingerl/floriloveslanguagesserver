import { Response } from "express";
import { Types } from "mongoose";
import { Quiz, Topic } from "../../models/LanguageLearningModel";
import { AuthenticatedRequest } from "./AuthController";
import {
  besitzer as besitzerVon,
  besitzerId,
  besitzPruefen,
} from "../../helpers/ownership";

// Eine quiz-Angabe ist entweder eine 24-stellige Mongo-Id oder das Fach eines
// Website-Quizzes. Daraus wird die _id des Quiz-Dokuments bestimmt.
async function quizIdAus(wert: unknown): Promise<Types.ObjectId | undefined> {
  if (wert === undefined || wert === null || wert === "") return undefined;
  if (typeof wert === "string" && /^[0-9a-fA-F]{24}$/.test(wert)) {
    return new Types.ObjectId(wert);
  }
  const quiz = await Quiz.findOne({ subject: String(wert) });
  return quiz?._id ? new Types.ObjectId(String(quiz._id)) : undefined;
}

// controllers/userController.js
export const createTopic = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const quizId = await quizIdAus(req.body.quiz);
    const quiz = quizId ? await Quiz.findById(quizId) : null;
    const topic = await Topic.create({
      ...req.body,
      // Alte Aufrufe schicken "quiz" (Fach als String), neu heisst das Feld
      // "subject"; "quiz" ist jetzt die _id des Quiz-Dokuments.
      subject: req.body.subject ?? req.body.language ?? quiz?.subject,
      quiz: quizId,
      // Der Besitzer kommt immer aus dem Token, nie aus dem Request-Body.
      user: besitzerId(req),
    });
    res.status(201).json(topic);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};


export const getAllTopics = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const topics = await Topic.find();
    res.json(topics);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

// Liefert alle Themen eines Faches, z. B. /api/topic/french. Frueher hiess das
// Feld "quiz" und der Filter suchte nach dem Quiz-Namen; heute gibt ein Thema
// sein Fach in "subject" an. Der URL-Parameter bleibt derselbe.
export const getTopicsForQuiz = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const topics = await Topic.find({ subject: req.params.quizName });
    res.json(topics);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

export const getTopicById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) {
      res.status(404).json({ message: "Topic not found" });
      return;
    }
    res.json(topic);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};


export const updateTopic = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const vorhanden = await Topic.findById(req.params.id);
    if (!vorhanden) {
      res.status(404).json({ message: "Topic not found" });
      return;
    }
    if (!besitzPruefen(req, res, vorhanden.user, "topic")) {
      return;
    }

    const daten: Record<string, unknown> = {
      ...req.body,
      user: besitzerVon(req, vorhanden.user),
    };
    if (req.body.quiz !== undefined) daten.quiz = await quizIdAus(req.body.quiz);
    if (req.body.language !== undefined && daten.subject === undefined)
      daten.subject = req.body.language;

    const topic = await Topic.findByIdAndUpdate(req.params.id, daten, {
      new: true,
      runValidators: true,
    });
    if (!topic) {
      res.status(404).json({ message: "Topic not found" });
      return;
    }
    res.json(topic);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

export const deleteTopic = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const vorhanden = await Topic.findById(req.params.id);
    if (!vorhanden) {
      res.status(404).json({ message: "Topic not found" });
      return;
    }
    if (!besitzPruefen(req, res, vorhanden.user, "topic")) {
      return;
    }

    await Topic.findByIdAndDelete(req.params.id);
    res.json({ message: "Topic deleted" });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

