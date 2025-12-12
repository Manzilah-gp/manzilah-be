import db from "../config/db.js";

/**
 * Teacher Model - Handles all teacher-specific database operations
 */
class TeacherModel {
    /**
     * Create teacher certification record
     */
    static async createCertification(userId, certification) {
        const [result] = await db.query(
            `INSERT INTO TEACHER_CERTIFICATION 
             (user_id, has_tajweed_certificate, has_sharea_certificate, 
              tajweed_certificate_url, sharea_certificate_url, 
              submitted_at)
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
                userId,
                certification.has_tajweed_certificate || false,
                certification.has_sharea_certificate || false,
                certification.tajweed_certificate_url || null,
                certification.sharea_certificate_url || null
            ]
        );
        return result.insertId;
    }

    /**
     * Add teacher expertise
     */
    static async addExpertise(teacherId, expertise) {
        const values = expertise.map(exp => [
            teacherId,
            exp.course_type_id,
            exp.is_memorization_selected || false,
            exp.max_mem_level_id || null,
            exp.years_experience || 0,
            exp.hourly_rate_cents || 0
        ]);

        if (values.length > 0) {
            await db.query(
                `INSERT INTO TEACHER_EXPERTISE 
                 (teacher_id, course_type_id, is_memorization_selected, 
                  max_mem_level_id, years_experience, hourly_rate_cents)
                 VALUES ?`,
                [values]
            );
        }
    }

    /**
     * Add teacher availability
     */
    static async addAvailability(teacherId, availability) {
        const values = availability.map(slot => [
            teacherId,
            slot.day_of_week,
            slot.start_time,
            slot.end_time
        ]);

        if (values.length > 0) {
            await db.query(
                `INSERT INTO TEACHER_AVAILABILITY 
                 (teacher_id, day_of_week, start_time, end_time)
                 VALUES ?`,
                [values]
            );
        }
    }

    /**
     * Assign teacher to mosques (Create pending role assignments)
     * Role ID 3 = Teacher
     */
    static async assignToMosques(teacherId, mosqueIds) {
        // Create a role assignment for each mosque selected
        // user_id, role_id (3 for teacher), mosque_id, is_approved (FALSE initially)
        const values = mosqueIds.map(mosqueId => [
            teacherId,
            3,
            mosqueId,
            false // is_active = FALSE
        ]);

        if (values.length > 0) {
            await db.query(
                `INSERT INTO ROLE_ASSIGNMENT (user_id, role_id, mosque_id, is_active)
                 VALUES ?`,
                [values]
            );
        }
    }
}

export default TeacherModel;