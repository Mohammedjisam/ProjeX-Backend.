import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { googleAuth, googleAuthCallback } from '../controllers/authController';

const router = express.Router();

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req: any, res) => {
    const token = jwt.sign(req.user, process.env.JWT_SECRET!, { expiresIn: "1h" });

    // Redirect to frontend with JWT token
    res.redirect(`${process.env.FRONTEND_URL}/auth?token=${token}`);
  }
);


export default router;
