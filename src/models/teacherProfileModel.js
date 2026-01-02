// PURPOSE: Handle teacher profile data operations
// REASON: Separate teacher-specific operations from general user profile

import db from "../config/db.js";

export class TeacherProfileModel {
    /**
     * Get complete teacher profile data
     * REASON: Fetch all teacher-related information for profile display
     * @param {number} userId - Teacher's user ID
     * @returns {Promise<Object>} - Complete teacher profile
     */
    static async getTeacherProfile(userId) {
        const profile = {};

        // Get certification information
        const [certRows] = await db.query(`
            SELECT 
                has_tajweed_certificate,
                has_sharea_certificate,
                tajweed_certificate_url,
                sharea_certificate_url,
                submitted_at
            FROM TEACHER_CERTIFICATION
            WHERE user_id = ?
        `, [userId]);

        profile.certifications = certRows[0] || null;

        // Get expertise information
        const [expertiseRows] = await db.query(`
            SELECT 
                te.id,
                te.course_type_id,
                ct.name as course_type_name,
                te.is_memorization_selected,
                te.max_mem_level_id,
                ml.level_name as max_memorization_level,
                te.years_experience,
                te.hourly_rate_cents
            FROM TEACHER_EXPERTISE te
            JOIN COURSE_TYPE ct ON te.course_type_id = ct.id
            LEFT JOIN MEMORIZATION_LEVEL ml ON te.max_mem_level_id = ml.id
            WHERE te.teacher_id = ?
        `, [userId]);

        profile.expertise = expertiseRows;

        // Get availability schedule
        const [availRows] = await db.query(`
            SELECT 
                id,
                day_of_week,
                start_time,
                end_time
            FROM TEACHER_AVAILABILITY
            WHERE teacher_id = ?
            ORDER BY 
                FIELD(day_of_week, 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
                start_time
        `, [userId]);

        profile.availability = availRows;

        return profile;
    }

    /**
     * Update teacher certifications
     * REASON: Allow teachers to update their certification status
     * @param {number} userId - Teacher's user ID
     * @param {Object} certData - Certification data
     */
    static async updateCertifications(userId, certData) {
        const {
            has_tajweed_certificate,
            has_sharea_certificate,
            tajweed_certificate_url,
            sharea_certificate_url
        } = certData;

        // Check if certification record exists
        const [existing] = await db.query(
            'SELECT id FROM TEACHER_CERTIFICATION WHERE user_id = ?',
            [userId]
        );

        if (existing.length > 0) {
            // Update existing record
            await db.query(`
                UPDATE TEACHER_CERTIFICATION SET
                    has_tajweed_certificate = ?,
                    has_sharea_certificate = ?,
                    tajweed_certificate_url = ?,
                    sharea_certificate_url = ?
                WHERE user_id = ?
            `, [
                has_tajweed_certificate,
                has_sharea_certificate,
                tajweed_certificate_url,
                sharea_certificate_url,
                userId
            ]);
        } else {
            // Create new record
            await db.query(`
                INSERT INTO TEACHER_CERTIFICATION (
                    user_id, has_tajweed_certificate, has_sharea_certificate,
                    tajweed_certificate_url, sharea_certificate_url
                ) VALUES (?, ?, ?, ?, ?)
            `, [
                userId,
                has_tajweed_certificate,
                has_sharea_certificate,
                tajweed_certificate_url,
                sharea_certificate_url
            ]);
        }
    }

    /**
     * Update or add teacher expertise
     * REASON: Allow teachers to modify their teaching capabilities
     * @param {number} userId - Teacher's user ID
     * @param {Array} expertiseData - Array of expertise objects
     */
    static async updateExpertise(userId, expertiseData) {
        // Delete existing expertise
        // REASON: Simpler to delete and re-insert than to update multiple rows
        await db.query('DELETE FROM TEACHER_EXPERTISE WHERE teacher_id = ?', [userId]);

        // Insert new expertise records
        if (expertiseData && expertiseData.length > 0) {
            const values = expertiseData.map(exp => [
                userId,
                exp.course_type_id,
                exp.is_memorization_selected || false,
                exp.max_mem_level_id || null,
                exp.years_experience || 0,
                exp.hourly_rate_cents || 0
            ]);

            await db.query(`
                INSERT INTO TEACHER_EXPERTISE (
                    teacher_id, course_type_id, is_memorization_selected,
                    max_mem_level_id, years_experience, hourly_rate_cents
                ) VALUES ?
            `, [values]);
        }
    }

    /**
     * Update teacher availability schedule
     * REASON: Allow teachers to manage their teaching hours
     * @param {number} userId - Teacher's user ID
     * @param {Array} availabilityData - Array of availability slots
     */
    static async updateAvailability(userId, availabilityData) {
        // Delete existing availability
        await db.query('DELETE FROM TEACHER_AVAILABILITY WHERE teacher_id = ?', [userId]);

        // Insert new availability slots
        if (availabilityData && availabilityData.length > 0) {
            const values = availabilityData.map(slot => [
                userId,
                slot.day_of_week,
                slot.start_time,
                slot.end_time
            ]);

            await db.query(`
                INSERT INTO TEACHER_AVAILABILITY (
                    teacher_id, day_of_week, start_time, end_time
                ) VALUES ?
            `, [values]);
        }
    }

    /**
     * Get all course types for dropdown selection
     * REASON: Teachers need to select which courses they can teach
     * @returns {Promise<Array>} - List of course types
     */
    static async getCourseTypes() {
        const [rows] = await db.query(`
            SELECT id, name, description
            FROM COURSE_TYPE
            ORDER BY name
        `);

        return rows;
    }

    /**
     * Get memorization levels for dropdown selection
     * REASON: Teachers need to specify their highest memorization qualification
     * @param {number} courseTypeId - Course type ID (optional filter)
     * @returns {Promise<Array>} - List of memorization levels
     */
    static async getMemorizationLevels(courseTypeId = null) {
        let query = `
            SELECT id, level_number, level_name, juz_range_start, juz_range_end
            FROM MEMORIZATION_LEVEL
        `;
        const params = [];

        if (courseTypeId) {
            query += ' WHERE course_type_id = ?';
            params.push(courseTypeId);
        }

        query += ' ORDER BY level_number';

        const [rows] = await db.query(query, params);
        return rows;
    }

    /**
     * Get teacher statistics
     * REASON: Show teachers their impact and activity
     * @param {number} userId - Teacher's user ID
     * @returns {Promise<Object>} - Teacher statistics
     */
    static async getTeacherStats(userId) {
        const stats = {};

        // Total courses taught
        const [coursesCount] = await db.query(`
            SELECT COUNT(*) as total
            FROM COURSE
            WHERE teacher_id = ?
        `, [userId]);
        stats.totalCourses = coursesCount[0].total;

        // Active courses
        const [activeCount] = await db.query(`
            SELECT COUNT(*) as total
            FROM COURSE
            WHERE teacher_id = ? AND is_active = true
        `, [userId]);
        stats.activeCourses = activeCount[0].total;

        // Total students across all courses
        const [studentsCount] = await db.query(`
            SELECT COUNT(DISTINCT e.student_id) as total
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            WHERE c.teacher_id = ? AND e.status = 'active'
        `, [userId]);
        stats.totalStudents = studentsCount[0].total;

        return stats;
    }
}