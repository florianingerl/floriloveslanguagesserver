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
const axios_1 = __importDefault(require("axios"));
const LanguageLearningModel_1 = require("../models/LanguageLearningModel");
function testDB() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("testDB function is called");
        try {
            // Step 1: Register a new user
            const user = {
                name: "John Doe",
                email: "johndoe@example.com",
                password: "password123",
                role: LanguageLearningModel_1.UserRole.User,
                isAdmin: false,
                _id: "",
                description: "",
                createdAt: new Date(),
                updatedAt: new Date(),
                user: "",
            };
            let sampleUser;
            try {
                const registeredUser = yield axios_1.default.post("http://localhost:8080/api/register", user);
                sampleUser = registeredUser.data.user;
                console.log("User registered", sampleUser);
            }
            catch (error) {
                if (error.response &&
                    error.response.data.message === "User already exists") {
                    const getUserResponse = yield axios_1.default.get(`http://localhost:8080/api/user?email=${user.email}`);
                    sampleUser = getUserResponse.data;
                    console.log("User already exists, proceeding with login...");
                }
                else {
                    throw error;
                }
            }
            // Step 2: Log in the user to get a JWT token
            const loginResponse = yield axios_1.default.post("http://localhost:8080/api/login", {
                email: user.email,
                password: user.password,
            });
            const token = loginResponse.data.token;
            console.log("User logged in, token received");
            const authHeaders = {
                headers: { "x-auth-token": token },
            };
            if (Array.isArray(sampleUser)) {
                sampleUser = sampleUser.find((x) => x.name == "John Doe");
            }
        }
        catch (error) {
            console.error("Error occurred during the test:", error.response ? error.response.data : error.message);
        }
    });
}
exports.default = testDB;
