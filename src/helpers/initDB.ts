import axios from "axios";
import { addDays, formatISO, startOfMonth } from "date-fns";
import { IUser } from "../models/LanguageLearningModel";
async function initDB(): Promise<void> {
  console.log("initDB function is called");

  try {
    // Step 1: Register a new user
    const user = {
      name: "John Doe",
      email: "johndoe@example.com",
      password: "password123",
    };

    let sampleUser: IUser;
    try {
      const registeredUser = await axios.post<{ user: IUser }>(
        "http://localhost:8080/api/register",
        user
      );
      sampleUser = registeredUser.data.user;
      console.log("User registered:", sampleUser._id);
    } catch (error: any) {
      if (
        error.response &&
        error.response.data.message === "User already exists"
      ) {
        // If user exists, retrieve their details
        const getUserResponse = await axios.get<IUser>(
          `http://localhost:8080/api/user?email=${user.email}`
        );
        sampleUser = getUserResponse.data;
        console.log("User already exists, proceeding with login...");
      } else {
        throw error;
      }
    }
    // Step 2: Log in the user to get a JWT token
    const loginResponse = await axios.post<{ token: string }>(
      "http://localhost:8080/api/login",
      {
        email: user.email,
        password: user.password,
      }
    );
    const token = loginResponse.data.token;
    console.log("User logged in, token received:", token);

    // Set the token in the headers for authenticated requests
    const authHeaders = {
      headers: { "x-auth-token": token },
    };

    // Get the start and end of the current month
    const start = startOfMonth(new Date().setMonth(new Date().getMonth() - 1));
    const end = new Date();

    // Step 3: Loop through each day of the month
    let currentDate = start;
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split("T")[0]; // Get the date in YYYY-MM-DD format
      if (Array.isArray(sampleUser)) {
        sampleUser = sampleUser.find((x) => x.name == "John Doe");
      }
      // Create working time
      const startTime = new Date(formatISO(currentDate.setHours(7, 0, 0))); // 7:00 AM
      const endTime = new Date(formatISO(currentDate.setHours(17, 0, 0))); // 5:00 PM
      
      // Move to the next day
      currentDate = addDays(currentDate, 1);
    }

    console.log("Initialization for all days in the current month complete.");
  } catch (error: any) {
    console.error(
      "Error occurred during the initialization:",
      error.response ? error.response.data : error.message
    );
  }
}

export default initDB;
