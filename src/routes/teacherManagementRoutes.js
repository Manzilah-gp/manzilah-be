import express from "express";
import {
    getTeachers,
    getTeacherDetails,
    toggleTeacherStatus,
    deleteTeacher,
    getTeacherCourses
} from "../controllers/teacherManagementController.js";
import { verifyToken, checkRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

// verifyToken middleware ensures user is logged in
// checkRole(['mosque_admin']) ensures only mosque admins can access these routes

router.get("/", verifyToken, checkRole(['mosque_admin']), getTeachers);
router.get("/:teacherId", verifyToken, checkRole(['mosque_admin']), getTeacherDetails);
router.patch("/:teacherId/status", verifyToken, checkRole(['mosque_admin']), toggleTeacherStatus);
router.delete("/:teacherId", verifyToken, checkRole(['mosque_admin']), deleteTeacher);
router.get("/:teacherId/courses", verifyToken, checkRole(['mosque_admin']), getTeacherCourses);

export default router;
