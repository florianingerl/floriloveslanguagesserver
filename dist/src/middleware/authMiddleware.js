"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_config_1 = __importDefault(require("../config/db.config"));
const authMiddleware = (req, res, next) => {
    const token = req.header("x-auth-token");
    if (!token) {
        res.status(401).json({ message: "No token, authorization denied" });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, db_config_1.default.JWT_SECRET);
        req.user = decoded; // Add user from payload
        next(); // Weitergabe an die nächste Middleware oder Route
    }
    catch (err) {
        res.status(401).json({ message: "Token is not valid" });
    }
};
exports.default = authMiddleware;
