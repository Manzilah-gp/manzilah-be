// ============================================
// FILE: src/routes/enrollmentRoutes.js
// ============================================
import express from "express";
import {
    checkEnrollmentEligibility,
    enrollInFreeCourse,
    enrollInPaidCourse,
    getMyEnrollments,
    getEnrollmentDetails
} from "../controllers/enrollmentController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All enrollment routes require authentication
router.use(verifyToken);

/**
 * Check if student can enroll in a course
 * POST /api/enrollment/check-eligibility
 * Body: { courseId: number }
 */
router.post("/check-eligibility", checkEnrollmentEligibility);

/**
 * Enroll in a FREE course
 * POST /api/enrollment/enroll-free
 * Body: { courseId: number }
 */
router.post("/enroll-free", enrollInFreeCourse);

/**
 * Enroll in a PAID course (with payment)
 * POST /api/enrollment/enroll-paid
 * Body: { courseId: number, paymentGateway?: string, paymentReference?: string }
 */
router.post("/enroll-paid", enrollInPaidCourse);

/**
 * Get my enrollments
 * GET /api/enrollment/my-enrollments
 */
router.get("/my-enrollments", getMyEnrollments);

/**
 * Get specific enrollment details
 * GET /api/enrollment/:id
 */
router.get("/:id", getEnrollmentDetails);

export default router;
