import { Response, Request } from "express";
import { Dict, DictPref } from "../../models/LanguageLearningModel";
import { AuthenticatedRequest } from "./AuthController";


export const createDictPref = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const dictPref = await DictPref.create({
        ...req.body,
      });
      res.status(201).json(dictPref);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: "An unknown error occurred" });
      }
    }
  };

  export const getDictPrefByEmailAndLg = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const dictPref = await Dict.find(req.params);
      if (!dictPref) {
        res.status(404).json({ message: "Dictionary preference not found" });
        return;
      }
      res.json(dictPref);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: "An unknown error occurred" });
      }
    }
  };
  

  export const updateDictPref = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const dictPref = await DictPref.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!dictPref) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      res.json(dictPref);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: "An unknown error occurred" });
      }
    }
  };

// controllers/userController.js
export const createDict = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const dict = await Dict.create({
      ...req.body,
    });
    res.status(201).json(dict);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

export const getAllDicts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const dicts = await Dict.find();
    res.json(dicts);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};

export const getDictById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const dict = await Dict.findById(req.params.id);
    if (!dict) {
      res.status(404).json({ message: "Dictionary not found" });
      return;
    }
    res.json(dict);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};



export const deleteDict = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const dict = await Dict.findByIdAndDelete(req.params.id);
    if (!dict) {
      res.status(404).json({ message: "Dictionary not found" });
      return;
    }
    res.json({ message: "Dictionary deleted" });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: "An unknown error occurred" });
    }
  }
};
