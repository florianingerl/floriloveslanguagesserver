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
const express_1 = __importDefault(require("express"));
const AuthController_1 = require("./src/controllers/TimeIT/AuthController");
const UserController_1 = require("./src/controllers/TimeIT/UserController");
const authMiddleware_1 = __importDefault(require("./src/middleware/authMiddleware"));
const router = express_1.default.Router();
// Auth routes
router.post("/api/register", AuthController_1.AuthController.register);
router.post("/api/login", AuthController_1.AuthController.login);
router.get("/api/auth/user", authMiddleware_1.default, AuthController_1.AuthController.getAuthenticatedUser);
router.get("/amen", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(201).json({ message: "This is the amen endpoint !" });
}));
// User routes
router.post("/api/user", UserController_1.createUser);
router.get("/api/user", UserController_1.getAllUsers);
router.get("/api/user/:id", UserController_1.getUserById);
router.put("/api/user/:id", UserController_1.updateUser);
router.delete("/api/user/:id", UserController_1.deleteUser);
exports.default = router;
