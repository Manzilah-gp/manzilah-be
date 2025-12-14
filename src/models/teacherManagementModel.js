import db from "../config/db.js";

export const TeacherManagementModel = {
    // Get list of teachers assigned to a mosque
    async getTeachersByMosque(mosqueId) {
        const query = `
            SELECT 
                u.id, 
                u.full_name, 
                u.email, 
                u.phone, 
                u.gender,
                ra.is_active,
                ra.assigned_at
            FROM ROLE_ASSIGNMENT ra
            JOIN USER u ON ra.user_id = u.id
            JOIN ROLE r ON ra.role_id = r.id
            WHERE ra.mosque_id = ? 
            AND r.name = 'teacher'
            ORDER BY u.full_name ASC
        `;
        const [teachers] = await db.execute(query, [mosqueId]);
        return teachers;
    },

    // Get full teacher details
    async getTeacherDetails(teacherId, mosqueId) {
        // 1. Basic User Info & Role Status
        const userQuery = `
            SELECT 
                u.id, u.full_name, u.email, u.phone, u.gender, u.dob,
                ra.is_active, ra.assigned_at
            FROM USER u
            JOIN ROLE_ASSIGNMENT ra ON u.id = ra.user_id
            WHERE u.id = ? AND ra.mosque_id = ?
        `;
        const [userRows] = await db.execute(userQuery, [teacherId, mosqueId]);
        if (userRows.length === 0) return null;
        const teacher = userRows[0];

        // 2. User Location
        const locationQuery = `
            SELECT address_line1, address_line2, region, governorate, postal_code
            FROM USER_LOCATION
            WHERE user_id = ?
        `;
        const [locationRows] = await db.execute(locationQuery, [teacherId]);
        teacher.location = locationRows.length > 0 ? locationRows[0] : null;

        // 3. Certifications
        const certQuery = `
            SELECT has_tajweed_certificate, has_sharea_certificate, tajweed_certificate_url, sharea_certificate_url
            FROM TEACHER_CERTIFICATION
            WHERE user_id = ?
        `;
        const [certRows] = await db.execute(certQuery, [teacherId]);
        teacher.certification = certRows.length > 0 ? certRows[0] : null;

        // 4. Expertise
        const expertiseQuery = `
            SELECT 
                ct.name as course_type,
                te.is_memorization_selected,
                ml.level_name as max_memorization_level,
                te.years_experience,
                te.hourly_rate_cents
            FROM TEACHER_EXPERTISE te
            JOIN COURSE_TYPE ct ON te.course_type_id = ct.id
            LEFT JOIN MEMORIZATION_LEVEL ml ON te.max_mem_level_id = ml.id
            WHERE te.teacher_id = ?
        `;
        const [expertiseRows] = await db.execute(expertiseQuery, [teacherId]);
        teacher.expertise = expertiseRows;

        // 5. Availability
        const availabilityQuery = `
            SELECT day_of_week, start_time, end_time
            FROM TEACHER_AVAILABILITY
            WHERE teacher_id = ?
            ORDER BY FIELD(day_of_week, 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'), start_time
        `;
        const [availabilityRows] = await db.execute(availabilityQuery, [teacherId]);
        teacher.availability = availabilityRows;

        return teacher;
    },

    // Update teacher active status in the mosque
    async updateTeacherStatus(teacherId, mosqueId, isActive) {
        const query = `
            UPDATE ROLE_ASSIGNMENT 
            SET is_active = ? 
            WHERE user_id = ? AND mosque_id = ? AND role_id = (SELECT id FROM ROLE WHERE name = 'teacher')
        `;
        const [result] = await db.execute(query, [isActive, teacherId, mosqueId]);
        return result.affectedRows > 0;
    },

    // Remove teacher from mosque (delete role assignment)
    async removeTeacherFromMosque(teacherId, mosqueId) {
        const query = `
            DELETE FROM ROLE_ASSIGNMENT 
            WHERE user_id = ? AND mosque_id = ? AND role_id = (SELECT id FROM ROLE WHERE name = 'teacher')
        `;
        const [result] = await db.execute(query, [teacherId, mosqueId]);
        return result.affectedRows > 0;
    },

    // Get courses assigned to a teacher in a mosque
    async getTeacherCourses(teacherId, mosqueId) {
        const query = `
            SELECT 
                c.id, 
                c.name, 
                ct.name as course_type,
                c.schedule_type,
                c.target_age_group,
                c.course_format,
                c.is_active,
                cs.day_of_week,
                cs.start_time,
                cs.end_time
            FROM COURSE c
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            JOIN COURSE_SCHEDULE cs ON c.id = cs.course_id
            WHERE c.teacher_id = ? AND c.mosque_id = ?
            ORDER BY c.is_active DESC, c.name ASC
        `;
        const [courses] = await db.execute(query, [teacherId, mosqueId]);
        return courses;
    }
};
