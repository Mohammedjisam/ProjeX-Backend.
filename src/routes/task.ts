import express from "express";
const taskRoutes = express.Router();

import TaskController from "../controllers/task/task.controller";
import { protect } from "../middleware/auth";


taskRoutes.get("/due-soon", protect, TaskController.getTasksDueSoon);

taskRoutes.get("/overdue", protect, TaskController.getOverdueTasks);

taskRoutes.get("/project/:projectId", protect, TaskController.getTasksByProject);

taskRoutes.post("/assignee", protect, TaskController.getTasksByAssignee);

taskRoutes.post("/developer", protect, TaskController.getTasksByDeveloperId);

taskRoutes.get("/:id", protect, TaskController.getTaskById);

taskRoutes.post("/project/:projectId", protect, TaskController.createTask);

taskRoutes.put("/:id", protect, TaskController.updateTask);

taskRoutes.delete("/:id", protect, TaskController.deleteTask);

taskRoutes.post("/updatestatus", protect, TaskController.updateTaskStatus);


export default taskRoutes;