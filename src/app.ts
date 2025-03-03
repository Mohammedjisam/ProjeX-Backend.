import express, { type Request, type Response, type NextFunction } from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"
import authRoutes from "./routes/auth.routes"
import passwordRoutes from './routes/password.routes'
import passport from "passport"
import { configureGoogleAuth } from "./config/googleAuth"
import companyAdminRouter from "../src/routes/companyAdminRouter" // Fix import name
import managerRouter from "./routes/manager"
import projectRouter from "./routes/project"

// Load environment variables
dotenv.config()

// Initialize Express app
const app = express()

// CORS configuration - updated to fix Cross-Origin-Opener-Policy issue
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
  }),
)

// Add headers to specifically address COOP issues
app.use((req, res, next) => {
  // Allow cross-origin sharing
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin")
  next()
})

// Other middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(passport.initialize())

// Initialize Google Auth configuration
configureGoogleAuth()

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/password", passwordRoutes)
app.use("/api/companyadmin", companyAdminRouter) 
app.use("/api/manager", managerRouter) 
app.use("/api/project",projectRouter)

// Add debug route for Google token verification
app.post("/api/auth/debug-token", (req, res) => {
  console.log("Received token data:", req.body)
  res.status(200).json({
    success: true,
    message: "Token data received",
    data: req.body,
  })
})

// Basic route for testing
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "Server is running" })
})

// MongoDB Connection with error handling
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ProjeX")
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch((err) => console.error("MongoDB Connection Error:", err))

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Server error:", err)
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "production" ? "Server Error" : err.message,
  })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app

