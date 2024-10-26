import express from "express";
import { AuthController } from "./src/controllers/TimeIT/AuthController";
import { checkTimeEntryConsistency } from "./src/controllers/TimeIT/ConsistencyController";
import {
  addTagsToCustomer,
  createCustomer,
  deleteCustomer,
  getCustomerById,
  getCustomers,
  removeTagFromCustomer,
  updateCustomer,
} from "./src/controllers/TimeIT/CustomerController";
import {
  addCommentToProject,
  addTagToProject,
  createProject,
  deleteProject,
  getProjectById,
  getProjects,
  removeCommentFromProject,
  removeTagFromProject,
  updateProject,
} from "./src/controllers/TimeIT/ProjectController";
import {
  createTag,
  deleteTag,
  getTagById,
  getTags,
  updateTag,
} from "./src/controllers/TimeIT/TagController";
import {
  addComment,
  addTags,
  deleteTimeEntry,
  getAllTimeEntries,
  getTimeEntriesByRange,
  getTimeEntryById,
  removeComment,
  removeTag,
  startTracking,
  stopTracking,
  updateTimeEntry,
} from "./src/controllers/TimeIT/TimeEntryController";
import {
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  updateUser,
} from "./src/controllers/TimeIT/UserController";
import authMiddleware from "./src/middleware/authMiddleware";

const router = express.Router();

// Auth routes
router.post("/api/register", AuthController.register);
router.post("/api/login", AuthController.login);
router.get(
  "/api/auth/user",
  authMiddleware,
  AuthController.getAuthenticatedUser
);

// User routes
router.post("/api/user", createUser);
router.get("/api/user", getAllUsers);
router.get("/api/user/:id", getUserById);
router.put("/api/user/:id", updateUser);
router.delete("/api/user/:id", deleteUser);

// Time Entry routes
router.post(
  "/api/timeEntry/consistencyCheck",
  authMiddleware,
  checkTimeEntryConsistency
);
router.post("/api/timeEntry/start", authMiddleware, startTracking);
router.put("/api/timeEntry/:id/stop", authMiddleware, stopTracking);
router.put("/api/timeEntry/:id/comment", authMiddleware, addComment);
router.put("/api/timeEntry/:id/tags", authMiddleware, addTags);
router.put("/api/timeEntry/:id/removeTag", authMiddleware, removeTag);
router.put("/api/timeEntry/:id/removeComment", authMiddleware, removeComment);
router.get("/api/timeEntry", authMiddleware, getAllTimeEntries);
router.get("/api/timeEntry/:id", authMiddleware, getTimeEntryById);
router.put("/api/timeEntry/:id", authMiddleware, updateTimeEntry);
router.delete("/api/timeEntry/:id", authMiddleware, deleteTimeEntry);
router.get("/api/timeEntries", authMiddleware, getTimeEntriesByRange);

// Project routes
router.post("/api/project", authMiddleware, createProject);
router.get("/api/project", authMiddleware, getProjects);
router.get("/api/project/:id", authMiddleware, getProjectById);
router.put("/api/project/:id", authMiddleware, updateProject);
router.delete("/api/project/:id", authMiddleware, deleteProject);
router.put("/api/project/:id/addComment", authMiddleware, addCommentToProject);
router.put("/api/project/:id/addTag", authMiddleware, addTagToProject);
router.put("/api/project/:id/removeTag", authMiddleware, removeTagFromProject);
router.put(
  "/api/project/:id/removeComment",
  authMiddleware,
  removeCommentFromProject
);

// Customer routes
router.post("/api/customer", authMiddleware, createCustomer);
router.get("/api/customer", authMiddleware, getCustomers);
router.get("/api/customer/:id", authMiddleware, getCustomerById);
router.put("/api/customer/:id", authMiddleware, updateCustomer);
router.delete("/api/customer/:id", authMiddleware, deleteCustomer);
router.put("/api/customer/:id/addTag", authMiddleware, addTagsToCustomer);
router.put(
  "/api/customer/:id/removeTag",
  authMiddleware,
  removeTagFromCustomer
);

// Tag routes
router.post("/api/tag", authMiddleware, createTag);
router.get("/api/tag", authMiddleware, getTags);
router.get("/api/tag/:id", authMiddleware, getTagById);
router.put("/api/tag/:id", authMiddleware, updateTag);
router.delete("/api/tag/:id", authMiddleware, deleteTag);

export default router;
