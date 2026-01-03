import express from "express";
import {
    updateMemorizationProgress,
    recordExamScore,
    recordFinalExam,
    markAttendance,
    getStudentProgress,
    getProgressHistory
} from "../controllers/progressController.js";
import { verifyToken, checkRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Teacher-only routes
router.use(verifyToken);
router.use(checkRole(['teacher', 'mosque_admin']));

// Memorization progress
router.post('/memorization/update-page', updateMemorizationProgress);
router.post('/memorization/record-exam', recordExamScore);
router.post('/memorization/final-exam', recordFinalExam);

// Attendance-based progress (Tajweed/Fiqh)
router.post('/attendance/mark', markAttendance);

// Get progress
router.get('/student/:enrollmentId', getStudentProgress);
router.get('/history/:enrollmentId', getProgressHistory);

export default router;