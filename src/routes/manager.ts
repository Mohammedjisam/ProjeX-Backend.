import express from "express";
const managerRouter = express.Router();

import {
  getProjectManagers,
  getProjectManagerById,
  createProjectManager,
  updateProjectManager,
  deleteProjectManager,
} from "../controllers/projectManager/projectManager.controller";

import {
  getDevelopers,
  getDeveloperById,
  createDeveloper,
  updateDeveloper,
  deleteDeveloper,
} from "../controllers/developer/developer.controller";

import { protect } from "../middleware/auth";

managerRouter.get("/getallprojectmanager", protect, getProjectManagers);
managerRouter.get("/getallprojectmanager/:id", protect, getProjectManagerById);
managerRouter.post("/addnewprojectmanager", protect, createProjectManager);
managerRouter.put("/updateprojectmanager/:id", protect, updateProjectManager);
managerRouter.delete("/getallprojectmanager/:id", protect, deleteProjectManager);

managerRouter.get("/getalldeveloper", protect, getDevelopers);
managerRouter.get("/getalldeveloper/:id", protect, getDeveloperById);
managerRouter.post("/addnewdeveloper", protect, createDeveloper);
managerRouter.put("/updatedeveloper/:id", protect, updateDeveloper);
managerRouter.delete("/getalldeveloper/:id", protect, deleteDeveloper);



export default managerRouter;