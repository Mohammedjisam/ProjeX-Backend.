import express from "express"
const adminRouter = express.Router()
import {
  getCompanyAdmins,
  deleteCompanyAdmin,
  toggleCompanyAdminStatus,
  getManagers,
  deleteManager,
  toggleManagerStatus,
  getProjectManagers,
  deleteProjectManager,
  toggleProjectManagerStatus,
  getDevelopers,
  deleteDeveloper,
  toggleDeveloperStatus
} from "../../src/controllers/admin/adminController"
import { protect } from "../middleware/auth"

// Company Admin Routes
adminRouter.get("/companyadmin", protect, getCompanyAdmins)
adminRouter.delete("/companyadmin/:id", protect, deleteCompanyAdmin)
adminRouter.patch("/companyadmin/:id/togglestatus", protect, toggleCompanyAdminStatus)

// Manager Routes
adminRouter.get("/manager", protect, getManagers)
adminRouter.delete("/manager/:id", protect, deleteManager)
adminRouter.patch("/manager/:id/togglestatus", protect, toggleManagerStatus)

// Project Manager Routes
adminRouter.get("/projectmanager", protect, getProjectManagers)
adminRouter.delete("/projectmanager/:id", protect, deleteProjectManager)
adminRouter.patch("/projectmanager/:id/togglestatus", protect, toggleProjectManagerStatus)

// Developer Routes
adminRouter.get("/developer", protect, getDevelopers)
adminRouter.delete("/developer/:id", protect, deleteDeveloper)
adminRouter.patch("/developer/:id/togglestatus", protect, toggleDeveloperStatus)

export default adminRouter