import express from "express";
import { register, login } from "../controllers/authController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Example of a protected route
router.get("/profile", verifyToken, (req, res) => {
    res.json({ message: `Welcome ${req.user.email}`, user: req.user });
});

export default router;
