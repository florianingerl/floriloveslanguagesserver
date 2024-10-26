import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import dbConfig from "../../config/db.config";
import { User } from "../../models/LanguageLearningModel";

export interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    [key: string]: any; // Allows additional properties
  };
}

const AuthController = {
  // Register a new user
  async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body;

      // Check if the user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({ message: "User already exists" });
        return;
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new user
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        isAdmin: false,
        role: "User",
      });

      const createdUser = await newUser.save();
      // Optionally, generate a token right after registration
      const token = jwt.sign({ id: createdUser._id }, dbConfig.JWT_SECRET, {
        expiresIn: "1h",
      });

      res.status(201).json({
        message: "User registered successfully",
        user: createdUser,
        token, // Return the token with the user data
      });
    } catch (err) {
      res.status(500).json({
        message: "Error registering user",
        error: (err as Error).message,
      });
    }
  },

  // Log in a user
  async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Check if the user exists
      const user = await User.findOne({ email });
      if (!user) {
        res.status(400).json({ message: "User does not exist" });
        return;
      }

      // Check if the password is correct
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(400).json({ message: "Invalid credentials" });
        return;
      }

      // Generate a JWT token
      const token = jwt.sign({ id: user._id }, dbConfig.JWT_SECRET, {
        expiresIn: "1h", // Token expires in 1 hour
      });

      res.status(200).json({ message: "Login successful", token, user });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error logging in", error: (err as Error).message });
    }
  },

  // Get the authenticated user's information
  async getAuthenticatedUser(
    req: AuthenticatedRequest, // Verwende AuthenticatedRequest hier
    res: Response
  ): Promise<void> {
    try {
      const user = await User.findById(req.user?.id).select("-password"); // Do not return password
      res.status(200).json(user);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error getting user", error: (err as Error).message });
    }
  },
};

// // Middleware to protect routes and get the authenticated user
// const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1];

//   if (token == null) {
//     res.sendStatus(401); // If no token
//     return;
//   }

//   jwt.verify(token, dbConfig.JWT_SECRET, (err, user) => {
//     if (err) {
//       res.sendStatus(403); // If token is invalid
//       return;
//     }
//     req.user = user as { id: string };
//     next();
//   });
// };

export { AuthController };
