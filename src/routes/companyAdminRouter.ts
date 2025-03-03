// src/routes/companyAdmin.routes.ts
import express from "express"
const companyAdminRouter = express.Router()
import {
  getManagers,
  getManagerById,
  createManager,
  updateManager,
  deleteManager,
} from "../controllers/manager/manager.controller"
import { protect } from "../middleware/auth"

// Updated routes to allow any authenticated user to access manager data
// Route for getting all managers - accessible by any authenticated user
companyAdminRouter.get("/getallmanager", protect, getManagers)

// Route for getting a single manager by ID - accessible by any authenticated user
companyAdminRouter.get("/getallmanager/:id", protect, getManagerById)

// Keep role-based authorization for administrative actions
// Route for creating a new manager
companyAdminRouter.post("/addnewmanager", protect, createManager)

// Route for updating a manager
companyAdminRouter.put("/updatemanager/:id", protect, updateManager)

// Route for deleting a manager
companyAdminRouter.delete("/getallmanager/:id", protect, deleteManager)

export default companyAdminRouter

