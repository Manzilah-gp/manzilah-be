import express from "express";
import {
    createCourse,
    getCoursesByMosque,
    getCourseById,
    updateCourse,
    deleteCourse,
    getSuggestedTeachers,
    assignTeacherToCourse,
    getCourseTypes,
    getMemorizationLevels,
    getMosqueIdForAdmin
} from "../controllers/courseController.js";
import { verifyToken, checkRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ✅ PUBLIC/GENERAL ROUTES
router.get("/types", verifyToken, getCourseTypes);
router.get("/memorization-levels", verifyToken, getMemorizationLevels);

// ✅ COURSE CRUD ROUTES - Mosque Admin Only
router.post("/", verifyToken, checkRole(["mosque_admin"]), createCourse);
router.get("/mosque/:mosqueId", verifyToken, getCoursesByMosque);
router.get("/mosque-admin/:adminId", verifyToken, checkRole(["mosque_admin"]), getMosqueIdForAdmin);
router.get("/:id", verifyToken, getCourseById);
router.put("/:id", verifyToken, checkRole(["mosque_admin"]), updateCourse);
router.delete("/:id", verifyToken, checkRole(["mosque_admin"]), deleteCourse);

// ✅ TEACHER SUGGESTION & ASSIGNMENT
router.post("/suggest-teachers", verifyToken, checkRole(["mosque_admin"]), getSuggestedTeachers);
router.post("/assign-teacher", verifyToken, checkRole(["mosque_admin"]), assignTeacherToCourse);


export default router;