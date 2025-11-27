import express from "express";
import { register, login, registerTeacher } from "../controllers/authController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ✅ Public routes
router.post("/register", register);
router.post("/register-teacher", registerTeacher);
router.post("/login", login);

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

        res.json({ user: user[0] });
    } catch (err) {
        res.status(500).json({ message: "Error fetching profile" });
    }
});

export default router;
