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
const date_fns_1 = require("date-fns");
function initDB() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("initDB function is called");
        try {
            // Step 1: Register a new user
            const user = {
                name: "John Doe",
                email: "johndoe@example.com",
                password: "password123",
            };
            let sampleUser;
            try {
                const registeredUser = yield axios_1.default.post("http://localhost:8080/api/register", user);
                sampleUser = registeredUser.data.user;
                console.log("User registered:", sampleUser._id);
            }
            catch (error) {
                if (error.response &&
                    error.response.data.message === "User already exists") {
                    // If user exists, retrieve their details
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
            console.log("User logged in, token received:", token);
            // Set the token in the headers for authenticated requests
            const authHeaders = {
                headers: { "x-auth-token": token },
            };
            // Get the start and end of the current month
            const start = (0, date_fns_1.startOfMonth)(new Date().setMonth(new Date().getMonth() - 1));
            const end = new Date();
            // Step 3: Loop through each day of the month
            let currentDate = start;
            while (currentDate <= end) {
                const dateStr = currentDate.toISOString().split("T")[0]; // Get the date in YYYY-MM-DD format
                if (Array.isArray(sampleUser)) {
                    sampleUser = sampleUser.find((x) => x.name == "John Doe");
                }
                // Create working time
                const startTime = new Date((0, date_fns_1.formatISO)(currentDate.setHours(7, 0, 0))); // 7:00 AM
                const endTime = new Date((0, date_fns_1.formatISO)(currentDate.setHours(17, 0, 0))); // 5:00 PM
                // Move to the next day
                currentDate = (0, date_fns_1.addDays)(currentDate, 1);
            }
            console.log("Initialization for all days in the current month complete.");
        }
        catch (error) {
            console.error("Error occurred during the initialization:", error.response ? error.response.data : error.message);
        }
    });
}
exports.default = initDB;
