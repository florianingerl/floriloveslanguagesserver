import axios from "axios";
import {
  ETimeEntry,
  ICustomer,
  IProject,
  ITag,
  ITimeEntry,
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
    // Create tags
    const tagData: ITag[] = [
      {
        user: sampleUser._id,
        name: "Important",
        description: "High priority tasks",
        color: "#FF0000",
        textColor: "#FF0000",
        _id: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        user: sampleUser._id,
        name: "Personal",
        description: "Personal tasks",
        color: "#00FF00",
        textColor: "#FF0000",
        _id: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const createdTags = await Promise.all(
      tagData.map((tag) =>
        axios.post("http://localhost:8080/api/tag", tag, authHeaders)
      )
    );
    const tagIds = createdTags.map((response) => response.data._id);
    console.log("Tags created:", tagIds);

    // Create a customer
    const customerData: ICustomer = {
      user: sampleUser._id,
      companyName: "Test Customer Corp",
      name: "Test Customer",
      description: "A test customer",
      tags: [tagIds[0]],
      _id: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const createdCustomer = await axios.post(
      "http://localhost:8080/api/customer",
      customerData,
      authHeaders
    );
    console.log("Customer created:", createdCustomer.data.name);

    // Create a project
    const projectData: IProject = {
      user: sampleUser._id,
      name: "Test Project",
      description: "A test project",
      startDate: new Date(),
      tags: [tagIds[1]],
      customer: [createdCustomer.data._id],
      endDate: new Date(),
      _id: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      comments: [],
    };
    const createdProject = await axios.post(
      "http://localhost:8080/api/project",
      projectData,
      authHeaders
    );
    console.log("Project created:", createdProject.data.name);

    // Create working time entry
    const workingTime: ITimeEntry = {
      name: "Work on Project A",
      description: "Developed feature X",
      user: sampleUser._id,
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      comments: ["Worked on project A"],
      tags: [tagIds[0]],
      type: ETimeEntry.work,
      _id: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      active: false,
    };
    await axios.post(
      "http://localhost:8080/api/timeEntry/start",
      { ...workingTime, type: "work" },
      authHeaders
    );
    console.log("Working time created");

    // Create pause time entry
    const pauseTime: ITimeEntry = {
      name: "Lunch Break",
      description: "30 minutes break",
      user: sampleUser._id,
      startTime: new Date(Date.now() + 1800000),
      endTime: new Date(Date.now() + 2400000),
      comments: ["Lunch break"],
      tags: [],
      type: ETimeEntry.pause,
      _id: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      active: false,
    };
    await axios.post(
      "http://localhost:8080/api/timeEntry/start",
      { ...pauseTime, type: "pause" },
      authHeaders
    );
    console.log("Pause time created");

    // Create project time entry
    const projectTime: ITimeEntry = {
      name: "Project X Development",
      description: "Work on project X features",
      user: sampleUser._id,
      project: createdProject.data._id,
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      comments: ["Worked on project X"],
      tags: [tagIds[1]],
      type: ETimeEntry.project,
      _id: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      active: false,
    };
    const createdProjectTime = await axios.post(
      "http://localhost:8080/api/timeEntry/start",
      { ...projectTime, type: "project" },
      authHeaders
    );
    console.log("Project time created:", createdProjectTime.data.type);

    // Step 9: Get all tags
    const allTags = await axios.get(
      "http://localhost:8080/api/tag",
      authHeaders
    );
    console.log("All tags:", allTags.data.length);

    // Step 10: Get all customers
    const allCustomers = await axios.get(
      "http://localhost:8080/api/customer",
      authHeaders
    );
    console.log("All customers:", allCustomers.data.length);

    // Step 11: Get all projects
    const allProjects = await axios.get(
      "http://localhost:8080/api/project",
      authHeaders
    );
    console.log("All projects:", allProjects.data.length);

    // Step 12: Get all time entries
    const allTimeEntries = await axios.get(
      "http://localhost:8080/api/timeEntry",
      authHeaders
    );
    console.log("All time entries:", allTimeEntries.data.length);

    // Step 13: Delete all tags
    await Promise.all(
      allTags.data.map((tag: ITag) =>
        axios.delete(`http://localhost:8080/api/tag/${tag._id}`, authHeaders)
      )
    );
    console.log("All tags deleted");

    // Step 14: Delete all customers
    await Promise.all(
      allCustomers.data.map((customer: ICustomer) =>
        axios.delete(
          `http://localhost:8080/api/customer/${customer._id}`,
          authHeaders
        )
      )
    );
    console.log("All customers deleted");

    // Step 15: Delete all projects
    await Promise.all(
      allProjects.data.map((project: IProject) =>
        axios.delete(
          `http://localhost:8080/api/project/${project._id}`,
          authHeaders
        )
      )
    );
    console.log("All projects deleted");

    // Step 16: Delete all time entries
    await Promise.all(
      allTimeEntries.data.map((entry: ITimeEntry) =>
        axios.delete(
          `http://localhost:8080/api/timeEntry/${entry._id}`,
          authHeaders
        )
      )
    );
    console.log("All time entries deleted");

    
  } catch (error: any) {
    console.error(
      "Error occurred during the test:",
      error.response ? error.response.data : error.message
    );
  }
}

export default testDB;
