import express from "express";
import { register, login, registerTeacher, sendVerificationCode, changePassword } from "../controllers/authController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import db from "../config/db.js";

const router = express.Router();

// ✅ Public routes
router.post("/register", register);
router.post("/register-teacher", registerTeacher);
router.post("/login", login);
router.post('/change-password', changePassword);
router.post('/send-code', sendVerificationCode);

import UserModel from "../models/UserModel.js";

// ✅ Protected route (requires token)
router.get("/profile", verifyToken, async (req, res) => {
    try {
        const [user] = await db.query(
            "SELECT id, full_name, email, phone, gender, dob FROM USER WHERE id = ?",
            [req.user.id]
        );

        if (user.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        // Fetch roles
        const roleRows = await UserModel.getUserRoles(req.user.id);
        const roles = roleRows.map(r => r.name);

        // Add roles to the user object
        const userData = {
            ...user[0],
            roles: roles
        };

        res.json({ user: userData });
    } catch (err) {
        console.error("Error fetching profile:", err);
        res.status(500).json({ message: "Error fetching profile" });
    }
});

export default router;
