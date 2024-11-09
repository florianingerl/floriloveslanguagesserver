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
router.post("/api/user", createUser);
router.get("/api/user", getAllUsers);
router.get("/api/user/:id", getUserById);
router.put("/api/user/:id", updateUser);
router.delete("/api/user/:id", deleteUser);

export default router;
