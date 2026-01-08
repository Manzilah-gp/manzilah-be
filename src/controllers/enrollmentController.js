// ============================================
// FILE: src/controllers/enrollmentController.js
// FINAL VERSION - With PaymentSuccess page
// ============================================
import { EnrollmentModel } from "../models/enrollmentModel.js";
import { CourseModel } from "../models/CourseModel.js";
import db from "../config/db.js";
import { notifyUser } from './firebaseNotificationController.js'; 


/**
 * Check enrollment eligibility
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
 * Enroll student in FREE course
 */
export const enrollInFreeCourse = async (req, res) => {
    try {
        const { courseId } = req.body;
        const studentId = req.user.id;

        const course = await CourseModel.findById(courseId);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        if (course.price_cents > 0) {
            return res.status(400).json({
                success: false,
                message: "This course requires payment. Please proceed to payment page."
            });
        }

        const eligibility = await EnrollmentModel.checkEligibility(studentId, courseId);

        if (!eligibility.eligible) {
            return res.status(400).json({
                success: false,
                message: "Cannot enroll in this course",
                reasons: eligibility.reasons
            });
        }

        const enrollmentResult = await EnrollmentModel.enrollStudent(studentId, courseId, null);

        if (!enrollmentResult.success) {
             await notifyUser(studentId, {
    type: 'course',
    title: 'Enrollment Successful',
    message: `You are now enrolled in ${course.name}`,
    link: `/enrollments`,
    icon: '✅'
  });

  // 2. Notify the teacher (if assigned)
  if (course.teacher_id) {
    const [students] = await db.execute(`
      SELECT full_name FROM user WHERE id = ?
    `, [studentId]);
    
    await notifyUser(course.teacher_id, {
      type: 'course',
      title: 'New Student Enrolled',
      message: `${students[0]?.full_name} enrolled in your course: ${course.name}`,
      link: `/courses/${courseId}`,
      icon: '👥'
    });
  }

  // 3. Notify parent (if exists)
  const [parents] = await db.execute(`
    SELECT parent_id 
    FROM parent_child_relationship 
    WHERE child_id = ? AND is_verified = 1
  `, [studentId]);

  for (const parent of parents) {
    const [students] = await db.execute(`
      SELECT full_name FROM user WHERE id = ?
    `, [studentId]);
    
    await notifyUser(parent.parent_id, {
      type: 'course',
      title: 'Child Enrolled in Course',
      message: `${students[0]?.full_name} enrolled in ${course.name}`,
      link: `/my-children`,
      icon: '📚'
    });
  }
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
 * Create Stripe checkout session for PAID course
 * Redirects to /payment/success after payment
 */
export const enrollInPaidCourse = async (req, res) => {
    try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        const { courseId } = req.body;
        const studentId = req.user.id;

        const course = await CourseModel.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        if (course.price_cents === 0) {
            return res.status(400).json({
                success: false,
                message: "This is a free course."
            });
        }

        const eligibility = await EnrollmentModel.checkEligibility(studentId, courseId);
        if (!eligibility.eligible) {
            return res.status(400).json({
                success: false,
                message: "Cannot enroll in this course",
                reasons: eligibility.reasons
            });
        }

        // ⭐ Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: course.name,
                        description: course.description || 'Islamic Course',
                    },
                    unit_amount: course.price_cents,
                },
                quantity: 1,
            }],
            mode: 'payment',
            metadata: {
                courseId: courseId.toString(),
                userId: studentId.toString(),
            },
            // ⭐ Redirect to success page after payment
            success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/public/course/${courseId}?payment=cancelled`,
        });

        res.status(200).json({
            success: true,
            message: "Payment session created",
            data: {
                sessionId: session.id,
                url: session.url
            }
        });

    } catch (error) {
        console.error("Error creating payment session:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create payment session",
            error: error.message
        });
    }
};

/**
 * Complete enrollment after Stripe payment succeeds
 * Called from PaymentSuccess page
 */
export const completeEnrollmentAfterPayment = async (req, res) => {
    try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        
        const { sessionId } = req.body;
        const studentId = req.user.id;

        // Verify payment with Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Payment not completed'
            });
        }

        const courseId = parseInt(session.metadata.courseId);
        const userId = parseInt(session.metadata.userId);

        if (userId !== studentId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        // ⭐ CHECK IF ALREADY ENROLLED (prevent duplicate)
        const existingEnrollments = await EnrollmentModel.getStudentEnrollments(studentId);
        const alreadyEnrolled = existingEnrollments.some(e => e.course_id === courseId);
        
        if (alreadyEnrolled) {
            const course = await CourseModel.findById(courseId);
            return res.status(200).json({
                success: true,
                message: "Already enrolled in this course",
                data: {
                    courseId,
                    courseName: course.name
                }
            });
        }

        const course = await CourseModel.findById(courseId);

        // ⭐ CHECK IF PAYMENT ALREADY EXISTS (prevent duplicate payment records)
        const [existingPayments] = await db.execute(`
            SELECT id FROM PAYMENT 
            WHERE user_id = ? 
            AND related_id = ? 
            AND payment_type = 'course'
            AND gateway_charge_id = ?
        `, [studentId, courseId, session.payment_intent]);

        let paymentId;
        
        if (existingPayments.length > 0) {
            // Payment already exists, use existing ID
            paymentId = existingPayments[0].id;
            console.log('✅ Using existing payment record:', paymentId);
        } else {
            // Create new payment record
            paymentId = await EnrollmentModel.createPayment({
                user_id: studentId,
                course_id: courseId,
                amount_cents: course.price_cents,
                gateway: 'stripe',
                gateway_reference: session.payment_intent,
                status: 'completed'
            });
            console.log('✅ Created new payment record:', paymentId);
        }

        // Enroll student
        const enrollmentResult = await EnrollmentModel.enrollStudent(
            studentId,
            courseId,
            paymentId
        );

        if (!enrollmentResult.success) {
            return res.status(400).json({
                success: false,
                message: enrollmentResult.error
            });
        }
 // 1. Notify student
  await notifyUser(studentId, {
    type: 'payment',
    title: 'Payment Successful',
    message: `You are now enrolled in ${course.name}`,
    link: `/enrollments`,
    icon: '💳'
  });

  // 2. Notify teacher
  if (course.teacher_id) {
    const [students] = await db.execute(`
      SELECT full_name FROM user WHERE id = ?
    `, [studentId]);
    
    await notifyUser(course.teacher_id, {
      type: 'course',
      title: 'New Paid Student Enrolled',
      message: `${students[0]?.full_name} enrolled in your course: ${course.name}`,
      link: `/courses/${courseId}`,
      icon: '💰'
    });
  }

  // 3. Notify parent
  const [parents] = await db.execute(`
    SELECT parent_id 
    FROM parent_child_relationship 
    WHERE child_id = ? AND is_verified = 1
  `, [studentId]);

  for (const parent of parents) {
    const [students] = await db.execute(`
      SELECT full_name FROM user WHERE id = ?
    `, [studentId]);
    
    await notifyUser(parent.parent_id, {
      type: 'payment',
      title: 'Child Enrollment Payment Completed',
      message: `${students[0]?.full_name} enrolled in ${course.name} (${(course.price_cents / 100).toFixed(2)} USD)`,
      link: `/my-children`,
      icon: '💳'
    });
  }
        res.status(201).json({
            success: true,
            message: "Payment successful! You are now enrolled.",
            data: {
                enrollmentId: enrollmentResult.enrollmentId,
                courseId,
                courseName: course.name
            }
        });

    } catch (error) {
        console.error('❌ Error completing enrollment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete enrollment',
            error: error.message
        });
    }
};

/**
 * Verify payment session status (optional - for frontend to check)
 */
export const verifyPaymentSession = async (req, res) => {
    try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        
        const { sessionId } = req.params;

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        res.status(200).json({
            success: true,
            data: {
                status: session.payment_status,
                metadata: session.metadata
            }
        });

    } catch (error) {
        console.error('Error verifying session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment session',
            error: error.message
        });
    }
};

/**
 * Get student's enrollments
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
 * Get enrollment details
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