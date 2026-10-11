import { Response } from "express";
import { Book } from "../../models/LanguageLearningModel";
import { AuthenticatedRequest } from "./AuthController";
import {
  besitzer as besitzerVon,
  besitzerId,
  besitzPruefen,
} from "../../helpers/ownership";

export const createBook = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const book = await Book.create({
      ...req.body,
      // Der Besitzer kommt immer aus dem Token, nie aus dem Request-Body.
      user: besitzerId(req),
    });
    res.status(201).json(book);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

export const getAllBooks = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const filter =
      typeof req.query.subject === "string" && req.query.subject
        ? { subject: req.query.subject }
        : {};
    const books = await Book.find(filter);
    res.json(books);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

export const getBookById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      res.status(404).json({ message: "Book not found" });
      return;
    }
    res.json(book);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

export const updateBook = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const vorhanden = await Book.findById(req.params.id);
    if (!vorhanden) {
      res.status(404).json({ message: "Book not found" });
      return;
    }
    if (!besitzPruefen(req, res, vorhanden.user, "book")) {
      return;
    }

    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { ...req.body, user: besitzerVon(req, vorhanden.user) },
      {
        new: true,
        runValidators: true,
      }
    );
    if (!book) {
      res.status(404).json({ message: "Book not found" });
      return;
    }
    res.json(book);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

export const deleteBook = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const vorhanden = await Book.findById(req.params.id);
    if (!vorhanden) {
      res.status(404).json({ message: "Book not found" });
      return;
    }
    if (!besitzPruefen(req, res, vorhanden.user, "book")) {
      return;
    }

    await Book.findByIdAndDelete(req.params.id);
    res.json({ message: "Book deleted" });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};