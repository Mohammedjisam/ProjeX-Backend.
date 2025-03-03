import express from "express";
const projectRouter = express.Router();

import ProjectController from "../controllers/project/project.controller";
import { protect } from "../middleware/auth";

// Project routes
projectRouter.get("/getallprojects", protect, ProjectController.getAllProjects);
projectRouter.get("/getallprojects/:id", protect, ProjectController.getProjectById);
projectRouter.post("/addnewproject", protect, ProjectController.createProject);
projectRouter.put("/updateproject/:id", protect, ProjectController.updateProject);
projectRouter.delete("/getallprojects/:id", protect, ProjectController.deleteProject);
projectRouter.post("/getallprojects/:id/comments", protect, ProjectController.addComment);


export default projectRouter;