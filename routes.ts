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

import {
  createQuiz,
  getQuizById,
  getQuizzes,
} from "./src/controllers/TimeIT/QuizController";

import {
  createBook,
  deleteBook,
  getAllBooks,
  getBookById,
  updateBook,
} from "./src/controllers/TimeIT/BookController";

import {
  createBookStore,
  getAllBookStores,
  getBookStoreById,
} from "./src/controllers/TimeIT/BookStoreController";

import {
  createSchool,
  getAllSchools,
} from "./src/controllers/TimeIT/SchoolController";


import { exportToFacile } from "./src/controllers/TimeIT/ExportFacileController";

import {
  getImage,
  uploadImage,
} from "./src/controllers/TimeIT/ImageController";

import authMiddleware from "./src/middleware/authMiddleware";

const router = express.Router();

// Auth routes
router.post("/api/register", AuthController.register);
router.post("/api/login", AuthController.login);
router.post("/api/verifyemail", AuthController.verifyEmail);
router.post("/api/resendverification", AuthController.resendVerification);
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
   res.status(201).json( { message: "This is the amen endpoint - updated!"});
});

router.get("/dummy", async (
  req: Request,
  res: Response
): Promise<void> => {
   console.log("The dummy endpoint was called!");
   res.status(201).json( { message: "This is the dummy endpoint !"});
});

// Spiel "Three-in-a-row": Die Spiellogik laeuft ueber socket.io
// (createSession, joinSession, move, newGame, switchColors, loadPgn),
// dieser Endpunkt meldet nur, dass das Spiel hier andhaengt.
router.get("/api/threeinarow", (
  req: Request,
  res: Response
): void => {
  res.json({
    game: "Three-in-a-row",
    transport: "socket.io",
    events: ["createSession", "joinSession", "move", "newGame", "switchColors", "loadPgn"],
  });
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
// Quizze: angelegt werden vor allem die Buch-Quizze, gelesen werden sie fuer
// die Anzeige im Buch (GET /api/quiz/:id) oder um das Website-Quiz eines Faches
// zu finden (GET /api/quiz?website=web&subject=deutsch).
router.post("/api/quiz", authMiddleware, createQuiz);
router.get("/api/quiz", getQuizzes);
router.get("/api/quiz/:id([0-9a-fA-F]{24})", getQuizById);
// Buecher (gemeinsames Schreiben mit VueBookWriter).
router.get("/api/book", getAllBooks);
router.get("/api/book/:id([0-9a-fA-F]{24})", getBookById);
router.post("/api/book", authMiddleware, createBook);
router.put("/api/book/:id([0-9a-fA-F]{24})", authMiddleware, updateBook);
router.delete("/api/book/:id([0-9a-fA-F]{24})", authMiddleware, deleteBook);
// Buchlaeden (buendeln die Buecher eines Faches).
router.get("/api/bookstore", getAllBookStores);
router.get("/api/bookstore/:id([0-9a-fA-F]{24})", getBookStoreById);
router.post("/api/bookstore", authMiddleware, createBookStore);
// Schulen: Auswahlliste fuer die Schule einer Aufgabe.
router.get("/api/school", getAllSchools);
router.post("/api/school", authMiddleware, createSchool);
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
// Bilder aus der Zwischenablage: hochladen (mit Token, mit Tageslimit) und
// wieder ausliefern (oeffentlich).
router.post("/api/image", authMiddleware, uploadImage);
router.get("/api/image/:id([0-9a-fA-F]{24})", getImage);

export default router;
