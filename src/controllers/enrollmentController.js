
// ============================================
// FILE: src/controllers/enrollmentController.js
// ============================================
import { EnrollmentModel } from "../models/enrollmentModel.js";
import { CourseModel } from "../models/CourseModel.js";


/**
 * @desc    Check enrollment eligibility
 * @route   POST /api/enrollment/check-eligibility
 * @access  Private (Authenticated users)
 */
export const checkEnrollmentEligibility = async (req, res) => {
    try {
        const { courseId } = req.body;
        const studentId = req.user.id;

        if (!courseId) {
            return res.status(400).json({
                success: false,
                message: "Course ID is required"
            });
        }

        // Check eligibility
        const eligibility = await EnrollmentModel.checkEligibility(studentId, courseId);

        res.status(200).json({
            success: true,
            data: eligibility
        });

    } catch (error) {
        console.error("Error checking eligibility:", error);
        res.status(500).json({
            success: false,
            message: "Failed to check eligibility",
            error: error.message
        });
    }
};

/**
 * @desc    Enroll student in a course (FREE courses only)
 * @route   POST /api/enrollment/enroll-free
 * @access  Private (Authenticated users)
 */
export const enrollInFreeCourse = async (req, res) => {
    try {
        const { courseId } = req.body;
        const studentId = req.user.id;

        // Get course details
        const course = await CourseModel.findById(courseId);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        // Verify course is free
        if (course.price_cents > 0) {
            return res.status(400).json({
                success: false,
                message: "This course requires payment. Please proceed to payment page."
            });
        }

        // Check eligibility first
        const eligibility = await EnrollmentModel.checkEligibility(studentId, courseId);

        if (!eligibility.eligible) {
            return res.status(400).json({
                success: false,
                message: "Cannot enroll in this course",
                reasons: eligibility.reasons
            });
        }

        // Enroll student (no payment needed)
        const enrollmentResult = await EnrollmentModel.enrollStudent(studentId, courseId, null);

        if (!enrollmentResult.success) {
            return res.status(400).json({
                success: false,
                message: enrollmentResult.error
            });
        }

        res.status(201).json({
            success: true,
            message: "Successfully enrolled in course!",
            data: {
                enrollmentId: enrollmentResult.enrollmentId,
                courseId,
                courseName: course.name
            }
        });

    } catch (error) {
        console.error("Error enrolling in free course:", error);
        res.status(500).json({
            success: false,
            message: "Failed to enroll in course",
            error: error.message
        });
    }
};

/**
 * @desc    Create payment and enroll (PAID courses)
 * @route   POST /api/enrollment/enroll-paid
 * @access  Private (Authenticated users)
 */
export const enrollInPaidCourse = async (req, res) => {
    try {
        const {
            courseId,
            paymentGateway = 'local',
            paymentReference = null
        } = req.body;
        const studentId = req.user.id;

        // Get course details
        const course = await CourseModel.findById(courseId);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        // Verify course requires payment
        if (course.price_cents === 0) {
            return res.status(400).json({
                success: false,
                message: "This is a free course. Use the free enrollment endpoint."
            });
        }

        // Check eligibility
        const eligibility = await EnrollmentModel.checkEligibility(studentId, courseId);

        if (!eligibility.eligible) {
            return res.status(400).json({
                success: false,
                message: "Cannot enroll in this course",
                reasons: eligibility.reasons
            });
        }

        // TODO: In production, integrate with actual payment gateway here
        // For now, we'll create a "completed" payment record

        // Create payment record
        const paymentId = await EnrollmentModel.createPayment({
            user_id: studentId,
            course_id: courseId,
            amount_cents: course.price_cents,
            gateway: paymentGateway,
            gateway_reference: paymentReference,
            status: 'completed'
        });

        // Enroll student with payment
        const enrollmentResult = await EnrollmentModel.enrollStudent(studentId, courseId, paymentId);

        if (!enrollmentResult.success) {
            return res.status(400).json({
                success: false,
                message: enrollmentResult.error
            });
        }

        res.status(201).json({
            success: true,
            message: "Payment successful! You are now enrolled.",
            data: {
                enrollmentId: enrollmentResult.enrollmentId,
                paymentId,
                courseId,
                courseName: course.name,
                amountPaid: course.price_cents
            }
        });

    } catch (error) {
        console.error("Error enrolling in paid course:", error);
        res.status(500).json({
            success: false,
            message: "Failed to process enrollment and payment",
            error: error.message
        });
    }
};

/**
 * @desc    Get student's enrollments
 * @route   GET /api/enrollment/my-enrollments
 * @access  Private (Authenticated users)
 */
export const getMyEnrollments = async (req, res) => {
    try {
        const studentId = req.user.id;

        const enrollments = await EnrollmentModel.getStudentEnrollments(studentId);

        res.status(200).json({
            success: true,
            data: enrollments,
            count: enrollments.length
        });

    } catch (error) {
        console.error("Error fetching enrollments:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch enrollments",
            error: error.message
        });
    }
};

/**
 * @desc    Get enrollment details
 * @route   GET /api/enrollment/:id
 * @access  Private (Student who owns it)
 */
export const getEnrollmentDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user.id;

        const enrollment = await EnrollmentModel.getEnrollmentById(id);

        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: "Enrollment not found"
            });
        }

        // Verify ownership
        if (enrollment.student_id !== studentId) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        res.status(200).json({
            success: true,
            data: enrollment
        });

    } catch (error) {
        console.error("Error fetching enrollment details:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch enrollment details",
            error: error.message
        });
    }
};