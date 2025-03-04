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

companyAdminRouter.get("/getallmanager", protect, getManagers)

companyAdminRouter.get("/getallmanager/:id", protect, getManagerById)

companyAdminRouter.post("/addnewmanager", protect, createManager)

companyAdminRouter.put("/updatemanager/:id", protect, updateManager)

companyAdminRouter.delete("/getallmanager/:id", protect, deleteManager)

export default companyAdminRouter

