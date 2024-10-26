import axios from "axios";
import { addDays, formatISO, startOfMonth } from "date-fns";
import { ETimeEntry, ITimeEntry, IUser } from "../models/LanguageLearningModel";
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
      const workEntry: ITimeEntry = {
        user: sampleUser._id,
        startTime,
        endTime,
        type: ETimeEntry.work,
        comments: [`Worked on project A on ${currentDate.toDateString()}`],
        name: `Work Day ${dateStr}`,
        description: "Work description",
        _id: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        active: false,
      };

      const createdWorkEntry = await axios.post<{ _id: string }>(
        "http://localhost:8080/api/timeEntry/start",
        workEntry,
        authHeaders
      );
      console.log("Work entry created for:", currentDate.toDateString());

      // Stop tracking work time
      await axios.put(
        `http://localhost:8080/api/timeEntry/${createdWorkEntry.data._id}/stop`,
        { endTime },
        authHeaders
      );

      // Create project time (Project A and B, split in two intervals)
      const projectEntry: ITimeEntry = {
        user: sampleUser._id,
        startTime: new Date(formatISO(currentDate.setHours(8, 0, 0))), // 8:00 AM
        endTime: new Date(formatISO(currentDate.setHours(12, 0, 0))), // 12:00 PM
        type: ETimeEntry.project,
        comments: [`Worked on project B on ${currentDate.toDateString()}`],
        name: `Project Day ${dateStr}`,
        description: "Project description",
        _id: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        active: false,
      };

      const projectEntry2: ITimeEntry = {
        user: sampleUser._id,
        startTime: new Date(formatISO(currentDate.setHours(13, 0, 0))), // 1:00 PM
        endTime: new Date(formatISO(currentDate.setHours(17, 0, 0))), // 5:00 PM
        type: ETimeEntry.project,
        comments: [`Worked on project A on ${currentDate.toDateString()}`],
        name: `Project Day ${dateStr}`,
        description: "Project description",
        createdAt: new Date(),
        updatedAt: new Date(),
        _id: "",
        active: false,
      };

      const createdProjectEntry = await axios.post<{ _id: string }>(
        "http://localhost:8080/api/timeEntry/start",
        projectEntry,
        authHeaders
      );

      const createdProjectEntry2 = await axios.post<{ _id: string }>(
        "http://localhost:8080/api/timeEntry/start",
        projectEntry2,
        authHeaders
      );
      console.log("Project entry created for:", currentDate.toDateString());

      // Stop tracking project time
      await axios.put(
        `http://localhost:8080/api/timeEntry/${createdProjectEntry.data._id}/stop`,
        { endTime: projectEntry.endTime },
        authHeaders
      );

      await axios.put(
        `http://localhost:8080/api/timeEntry/${createdProjectEntry2.data._id}/stop`,
        { endTime: projectEntry2.endTime },
        authHeaders
      );

      // Create pause time (1-hour lunch break)
      const pauseEntry: ITimeEntry = {
        user: sampleUser._id,
        startTime: new Date(formatISO(currentDate.setHours(12, 0, 0))), // 12:00 PM
        endTime: new Date(formatISO(currentDate.setHours(13, 0, 0))), // 1:00 PM
        type: ETimeEntry.pause,
        comments: [`Lunch break on ${currentDate.toDateString()}`],
        name: `Pause Day ${dateStr}`,
        description: "Pause description",
        _id: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        active: false,
      };

      const createdPauseEntry = await axios.post<{ _id: string }>(
        "http://localhost:8080/api/timeEntry/start",
        pauseEntry,
        authHeaders
      );
      console.log("Pause entry created for:", currentDate.toDateString());

      // Stop tracking pause time
      await axios.put(
        `http://localhost:8080/api/timeEntry/${createdPauseEntry.data._id}/stop`,
        { endTime: pauseEntry.endTime },
        authHeaders
      );

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
