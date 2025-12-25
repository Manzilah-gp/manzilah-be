
import express from "express";
import { getMySchedule } from "../controllers/calendarController.js";
import { verifyToken, checkRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/my-schedule", verifyToken, checkRole(["teacher", "parent", "student", "mosque_admin"]), getMySchedule);

export default router;