// ============================================
// FILE: src/routes/enrollmentRoutes.js
// ============================================
import express from "express";
import {
    checkEnrollmentEligibility,
    enrollInFreeCourse,
    enrollInPaidCourse,
    getMyEnrollments,
    getEnrollmentDetails,
   completeEnrollmentAfterPayment , 

    verifyPaymentSession      
} from "../controllers/enrollmentController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();


/**

 * GET /api/enrollment/verify-payment/:sessionId
 */
router.get("/verify-payment/:sessionId", verifyToken, verifyPaymentSession);



// All other enrollment routes require authentication
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
 * Enroll in a PAID course (creates Stripe checkout session)
 *  MODIFIED: Now returns Stripe session URL instead of direct enrollment
 */
router.post("/enroll-paid", enrollInPaidCourse);

/**
 * Get my enrollments
 * GET /api/enrollment/my-enrollments
 */
router.get("/my-enrollments", getMyEnrollments);


router.get("/:id", getEnrollmentDetails);
/**
 * Complete enrollment after payment
 * POST /api/enrollment/complete-payment
 */
router.post("/complete-payment", completeEnrollmentAfterPayment); 
export default router;