import express from "express";
const taskRoutes = express.Router();

import TaskController from "../controllers/task/task.controller";
import { protect } from "../middleware/auth";


// Get tasks due soon (next 7 days)
taskRoutes.get("/due-soon", protect, TaskController.getTasksDueSoon);

// Get overdue tasks
taskRoutes.get("/overdue", protect, TaskController.getOverdueTasks);

// Get tasks by project
taskRoutes.get("/project/:projectId", protect, TaskController.getTasksByProject);

// Updated route for getting tasks by assignee
taskRoutes.post("/assignee", protect, TaskController.getTasksByAssignee);

// Get a single task
taskRoutes.get("/:id", protect, TaskController.getTaskById);

// Create a new task
// Create a new task for a specific project
taskRoutes.post("/project/:projectId", protect, TaskController.createTask);

// Update a task
taskRoutes.put("/:id", protect, TaskController.updateTask);

// Delete a task
taskRoutes.delete("/:id", protect, TaskController.deleteTask);



export default taskRoutes;