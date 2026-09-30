import { Response } from "express";
import { Topic } from "../../models/LanguageLearningModel";
import { AuthenticatedRequest } from "./AuthController";

// controllers/userController.js
export const createTopic = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const topic = await Topic.create({
      ...req.body,
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
    const topic = await Topic.findByIdAndUpdate(req.params.id, req.body, {
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
    const topic = await Topic.findByIdAndDelete(req.params.id);
    if (!topic) {
      res.status(404).json({ message: "Topic not found" });
      return;
    }
    res.json({ message: "Topic deleted" });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

