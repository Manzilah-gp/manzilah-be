// ============================================
// FILE: src/models/enrollmentModel.js
// MODIFIED: Added updatePaymentStatus method for Stripe webhook
// ============================================
import db from "../config/db.js";

export const EnrollmentModel = {
    /**
     * Check if student can enroll in a course
     * Uses the stored function fn_check_enrollment_eligibility
     */
    async checkEligibility(studentId, courseId) {
        const [result] = await db.execute(`
            SELECT fn_check_enrollment_eligibility(?, ?) as eligibility
        `, [studentId, courseId]);

        let eligibility = result[0].eligibility;
        if (typeof eligibility === 'string') {
            eligibility = JSON.parse(eligibility);
        }
        return eligibility;
    },

    /**
     * Enroll student in course
     * Uses stored procedure sp_enroll_student
     */
   async enrollStudent(studentId, courseId, paymentId = null) {
    try {
        // Call stored procedure
        await db.execute(`
            CALL sp_enroll_student(?, ?, ?, @enrollment_id, @error_message)
        `, [studentId, courseId, paymentId]);

        // Get output parameters
        const [output] = await db.execute(`
            SELECT @enrollment_id as enrollment_id, @error_message as error_message
        `);

        const { enrollment_id, error_message } = output[0];

        if (error_message) {
            return {
                success: false,
                error: error_message
            };
        }

        return {
            success: true,
            enrollmentId: enrollment_id
        };

    } catch (error) {
        console.error('Error enrolling student:', error);
        return {
            success: false,
            error: error.message
        };
    }
},

    /**
     * Get enrollment details
     */
    async getEnrollmentById(enrollmentId) {
        const [enrollments] = await db.execute(`
            SELECT 
                e.*,
                c.name as course_name,
                c.price_cents,
                m.name as mosque_name,
                u.full_name as student_name
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            JOIN MOSQUE m ON c.mosque_id = m.id
            JOIN USER u ON e.student_id = u.id
            WHERE e.id = ?
        `, [enrollmentId]);

        return enrollments[0] || null;
    },

    /**
     * Get all enrollments for a student
     */
    async getStudentEnrollments(studentId) {
        const [enrollments] = await db.execute(`
            SELECT 
                e.id,
                e.status,
                e.enrollment_date,
                c.id as course_id,
                c.name as course_name,
                c.course_start_date,
                c.course_end_date,
                ct.name as course_type,
                m.name as mosque_name,
                sp.completion_percentage
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            JOIN MOSQUE m ON c.mosque_id = m.id
            LEFT JOIN STUDENT_PROGRESS sp ON e.id = sp.enrollment_id
            WHERE e.student_id = ?
            ORDER BY e.enrollment_date DESC
        `, [studentId]);

        return enrollments;
    },

    /**
     * Create payment record
     */
    async createPayment(paymentData) {
        const {
            user_id,
            course_id,
            amount_cents,
            gateway = 'local',
            gateway_reference = null,
            status = 'completed'
        } = paymentData;

        const [result] = await db.execute(`
            INSERT INTO PAYMENT 
            (user_id, amount_cents, currency, gateway, 
             gateway_charge_id, status, payment_type, related_id)
            VALUES (?, ?, 'ILS', ?, ?, ?, 'course', ?)
        `, [
            user_id,
            amount_cents,
            gateway,
            gateway_reference,
            status,
            course_id
        ]);

        return result.insertId;
    },

   
    /**
     * Update payment status after Stripe confirms payment
     * PURPOSE: Mark payment as completed when webhook is received
     * REASON: Ensures payment record reflects actual Stripe status
     * 
     * @param {number} paymentId - ID of payment record
     * @param {string} status - New status (pending/completed/failed)
     * @param {string} gatewayChargeId - Stripe payment intent ID
     */
    async updatePaymentStatus(paymentId, status, gatewayChargeId) {
        await db.execute(`
            UPDATE PAYMENT 
            SET status = ?, 
                gateway_charge_id = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [status, gatewayChargeId, paymentId]);
    }
};