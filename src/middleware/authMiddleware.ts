import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import dbConfig from "../config/db.config";
import { AuthenticatedRequest } from "../controllers/TimeIT/AuthController";

interface DecodedToken {
  id: string;
  iat: number;
  exp: number;
}
const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const token = req.header("x-auth-token");

  if (!token) {
    res.status(401).json({ message: "No token, authorization denied" });
    return;
  }

  try {
    const decoded = jwt.verify(token, dbConfig.JWT_SECRET) as DecodedToken;
    req.user = decoded; // Add user from payload
    next(); // Weitergabe an die nächste Middleware oder Route
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

export default authMiddleware;
