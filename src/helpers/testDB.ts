import axios from "axios";
import {
  IUser,
  UserRole,
} from "../models/LanguageLearningModel";

async function testDB() {
  console.log("testDB function is called");

  try {
    // Step 1: Register a new user
    const user: IUser = {
      name: "John Doe",
      email: "johndoe@example.com",
      password: "password123",
      role: UserRole.User,
      isAdmin: false,
      _id: "",
      description: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      user: "",
    };

    let sampleUser: any;
    try {
      const registeredUser = await axios.post(
        "http://localhost:8080/api/register",
        user
      );
      sampleUser = registeredUser.data.user;
      console.log("User registered", sampleUser);
    } catch (error: any) {
      if (
        error.response &&
        error.response.data.message === "User already exists"
      ) {
        const getUserResponse = await axios.get(
          `http://localhost:8080/api/user?email=${user.email}`
        );
        sampleUser = getUserResponse.data;
        console.log("User already exists, proceeding with login...");
      } else {
        throw error;
      }
    }

    // Step 2: Log in the user to get a JWT token
    const loginResponse = await axios.post("http://localhost:8080/api/login", {
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
    


    
  } catch (error: any) {
    console.error(
      "Error occurred during the test:",
      error.response ? error.response.data : error.message
    );
  }
}

export default testDB;
