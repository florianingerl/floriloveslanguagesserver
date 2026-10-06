import express from "express";
import { AuthController } from "./src/controllers/TimeIT/AuthController";
import { Request, Response } from "express";

import {
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  updateUser,
} from "./src/controllers/TimeIT/UserController";

import {
  createExercise,
  deleteExercise,
  getAllExercises,
  getExerciseById,
  updateExercise,
} from "./src/controllers/TimeIT/ExerciseController";

import {
  createDict,
  createDictPref,
  //updateOrCreateDictPref,
  getDictPrefByEmailAndLg,
} from "./src/controllers/TimeIT/DictController";

import {
  createTopic,
  deleteTopic,
  getAllTopics,
  getTopicById,
  getTopicsForQuiz,
  updateTopic
} from "./src/controllers/TimeIT/TopicController";


import { exportToFacile } from "./src/controllers/TimeIT/ExportFacileController";

import authMiddleware from "./src/middleware/authMiddleware";

const router = express.Router();

// Auth routes
router.post("/api/register", AuthController.register);
router.post("/api/login", AuthController.login);
router.get(
  "/api/auth/user",
  authMiddleware,
  AuthController.getAuthenticatedUser
);

router.get("/amen", async (
  req: Request,
  res: Response
): Promise<void> => {
   console.log("The amen endpoint was called!");
   res.status(201).json( { message: "This is the amen endpoint !"});
});
// User routes
// Lesen bleibt frei, damit Besucher ohne Anmeldung das Quiz sehen koennen.
// Angelegt, geaendert und geloescht wird nur mit einem gueltigen Token
// (Header "x-auth-token"), den authMiddleware prueft.
router.post("/api/topic", authMiddleware, createTopic);
router.get("/api/topic", getAllTopics);
// :id ist auf 24-stellige Mongo-IDs eingeschraenkt, damit
// /api/topic/french nicht in getTopicById landet, sondern in getTopicsForQuiz.
router.get("/api/topic/:id([0-9a-fA-F]{24})", getTopicById );
router.get("/api/topic/:quizName", getTopicsForQuiz );
router.put("/api/topic/:id", authMiddleware, updateTopic);
router.delete("/api/topic/:id", authMiddleware, deleteTopic );
router.post("/api/exercise", authMiddleware, createExercise);
router.get("/api/exercise", getAllExercises );
router.get("/api/exercise/:id", getExerciseById);
router.put("/api/exercise/:id", authMiddleware, updateExercise);
router.delete("/api/exercise/:id", authMiddleware, deleteExercise);
router.post("/api/user", createUser);
router.get("/api/user", getAllUsers);
router.get("/api/user/:id", getUserById);
router.put("/api/user/:id", updateUser);
router.delete("/api/user/:id", deleteUser);
router.post("/api/dict", createDict );
router.post("/api/dictprefbymailandlg", getDictPrefByEmailAndLg);
router.post("/api/createDictionaryPref", createDictPref );
//router.post("/api/updateOrCreateDictionaryPref", updateOrCreateDictPref );
// Leitet den Test-Export an *facile.com weiter, weil der Browser das Cookie-Header
// nicht setzen darf und die Seite keine CORS-Antworten schickt.
router.post("/api/exportfacile", exportToFacile);

export default router;
