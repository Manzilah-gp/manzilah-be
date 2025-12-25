import express from "express";
import {
    getMyEnrollments,
    getEnrollmentDetails,
    getStudentStats,
    withdrawFromCourse,
    getCoursesByMosque,
    getChildren
} from "../controllers/studentDashboardController.js";
import { verifyToken, checkRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All routes are protected and require student or parent role
router.use(verifyToken, checkRole(["student", "parent"]));

router.get("/my-enrollments", getMyEnrollments);
router.get("/children", getChildren);
router.get("/enrollments/:enrollmentId", getEnrollmentDetails);
router.get("/stats", getStudentStats);
router.post("/enrollments/:enrollmentId/withdraw", withdrawFromCourse);
router.get("/mosques/:mosqueId/courses", getCoursesByMosque);

export default router;
