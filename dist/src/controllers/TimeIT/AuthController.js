"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_config_1 = __importDefault(require("../../config/db.config"));
const LanguageLearningModel_1 = require("../../models/LanguageLearningModel");
const AuthController = {
    // Register a new user
    register(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, email, password } = req.body;
                // Check if the user already exists
                const existingUser = yield LanguageLearningModel_1.User.findOne({ email });
                if (existingUser) {
                    res.status(400).json({ message: `A user with the email ${email} already exists!` });
                    return;
                }
                // Hash the password
                const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
                // Create a new user
                const newUser = new LanguageLearningModel_1.User({
                    name,
                    email,
                    password: hashedPassword,
                    isAdmin: false,
                    role: "User",
                });
                const createdUser = yield newUser.save();
                // Optionally, generate a token right after registration
                const token = jsonwebtoken_1.default.sign({ id: createdUser._id }, db_config_1.default.JWT_SECRET, {
                    expiresIn: "1h",
                });
                res.status(201).json({
                    message: "User registered successfully",
                    user: createdUser,
                    token, // Return the token with the user data
                });
            }
            catch (err) {
                res.status(500).json({
                    message: "Error registering user",
                    error: err.message,
                });
            }
        });
    },
    // Log in a user
    login(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, password } = req.body;
                // Check if the user exists
                const user = yield LanguageLearningModel_1.User.findOne({ email });
                if (!user) {
                    res.status(400).json({ message: "User does not exist" });
                    return;
                }
                // Check if the password is correct
                const isMatch = yield bcryptjs_1.default.compare(password, user.password);
                if (!isMatch) {
                    res.status(400).json({ message: "Invalid credentials" });
                    return;
                }
                // Generate a JWT token
                const token = jsonwebtoken_1.default.sign({ id: user._id }, db_config_1.default.JWT_SECRET, {
                    expiresIn: "1h", // Token expires in 1 hour
                });
                res.status(200).json({ message: "Login successful", token, user });
            }
            catch (err) {
                res
                    .status(500)
                    .json({ message: "Error logging in", error: err.message });
            }
        });
    },
    // Get the authenticated user's information
    getAuthenticatedUser(req, // Verwende AuthenticatedRequest hier
    res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user = yield LanguageLearningModel_1.User.findById((_a = req.user) === null || _a === void 0 ? void 0 : _a.id).select("-password"); // Do not return password
                res.status(200).json(user);
            }
            catch (err) {
                res
                    .status(500)
                    .json({ message: "Error getting user", error: err.message });
            }
        });
    },
};
exports.AuthController = AuthController;
