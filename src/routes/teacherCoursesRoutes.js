// src/routes/teacherCoursesRoutes.js
import express from "express";
import {
    getMyCourses,
    getCourseStudents,
    getAllMyStudents,
    getSessionStudents,
    bulkMarkAttendance
} from "../controllers/teacherCoursesController.js";
import { verifyToken, checkRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All routes require teacher role
router.use(verifyToken, checkRole(['teacher']));

// Get teacher's courses
router.get('/my-courses', getMyCourses);

// Get all students across all courses
router.get('/students', getAllMyStudents);

// Get students for specific course
router.get('/courses/:courseId/students', getCourseStudents);

// Get students for specific session date
router.get('/courses/:courseId/session-students', getSessionStudents);

// Bulk mark attendance
router.post('/attendance/bulk', bulkMarkAttendance);

export default router;