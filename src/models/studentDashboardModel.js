import db from "../config/db.js";

export const StudentDashboardModel = {

    /**
     * Get all enrollments for a student with optional filtering
     */
    async findAllEnrollments(studentIds, status = null, search = null) {
        if (!studentIds || studentIds.length === 0) {
            return [];
        }

        // Create placeholders for the IN clause
        const placeholders = studentIds.map(() => '?').join(',');

        let query = `
            SELECT 
                e.id as enrollment_id,
                e.student_id,
                e.course_id,
                e.status as enrollment_status,
                e.enrollment_date,
                e.completed_at,
                e.payment_id,
                
                -- Course details
                c.name as course_name,
                c.description,
                c.course_format,
                c.price_cents,
                c.schedule_type,
                c.target_age_group,
                c.course_start_date,
                c.course_end_date,
                
                -- Course type
                ct.name as course_type,
                
                -- Teacher info
                teacher.full_name as teacher_name,
                
                -- Mosque info
                m.name as mosque_name,
                m.id as mosque_id,
                ml.governorate,
                ml.region,
                
                -- Progress info
                sp.completion_percentage,
                sp.teacher_notes,
                sp.updated_at as progress_updated_at,
                
                -- Payment info
                p.status as payment_status,
                p.amount_cents as payment_amount,

                -- Student info (useful for parents)
                stu.full_name as student_name
                
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            JOIN MOSQUE m ON c.mosque_id = m.id
            JOIN USER stu ON e.student_id = stu.id
            LEFT JOIN MOSQUE_LOCATION ml ON m.id = ml.mosque_id
            LEFT JOIN USER teacher ON c.teacher_id = teacher.id
            LEFT JOIN STUDENT_PROGRESS sp ON e.id = sp.enrollment_id
            LEFT JOIN PAYMENT p ON e.payment_id = p.id
            WHERE e.student_id IN (${placeholders})
        `;

        const params = [...studentIds];

        // Filter by status
        if (status && status !== 'all') {
            query += ` AND e.status = ?`;
            status = status.toLowerCase();
            params.push(status);
        }

        // Search by course name
        if (search) {
            query += ` AND c.name LIKE ?`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY e.enrollment_date DESC`;

        const [enrollments] = await db.execute(query, params);
        return enrollments;
    },

    /**
     * Get validated children IDs for a parent
     */
    async findChildrenByParentId(parentId) {
        const [children] = await db.execute(`
            SELECT child_id 
            FROM PARENT_CHILD_RELATIONSHIP 
            WHERE parent_id = ? AND is_verified = TRUE
        `, [parentId]);

        return children.map(c => c.child_id);
    },

    /**
     * Get details of a specific enrollment
     */
    async findEnrollmentById(enrollmentId, studentIds) {
        // Handle single ID or array
        const ids = Array.isArray(studentIds) ? studentIds : [studentIds];

        if (ids.length === 0) return null;

        const placeholders = ids.map(() => '?').join(',');

        const [enrollments] = await db.execute(`
            SELECT 
                e.*,
                c.*,
                ct.name as course_type,
                ct.description as course_type_description,
                teacher.full_name as teacher_name,
                teacher.email as teacher_email,
                teacher.phone as teacher_phone,
                m.name as mosque_name,
                m.contact_number as mosque_contact,
                ml.address as mosque_address,
                ml.governorate,
                ml.region,
                sp.completion_percentage,
                sp.teacher_notes,
                sp.updated_at as progress_updated_at,
                p.status as payment_status,
                p.amount_cents as payment_amount,
                p.receipt_url
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            JOIN MOSQUE m ON c.mosque_id = m.id
            LEFT JOIN MOSQUE_LOCATION ml ON m.id = ml.mosque_id
            LEFT JOIN USER teacher ON c.teacher_id = teacher.id
            LEFT JOIN STUDENT_PROGRESS sp ON e.id = sp.enrollment_id
            LEFT JOIN PAYMENT p ON e.payment_id = p.id
            WHERE e.id = ? AND e.student_id IN (${placeholders})
        `, [enrollmentId, ...ids]);

        return enrollments.length > 0 ? enrollments[0] : null;
    },

    /**
     * Get schedule for a course
     */
    async findCourseSchedule(courseId) {
        const [schedules] = await db.execute(`
            SELECT day_of_week, start_time, end_time, location
            FROM COURSE_SCHEDULE
            WHERE course_id = ?
            ORDER BY FIELD(day_of_week, 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')
        `, [courseId]);
        return schedules;
    },

    /**
     * Get basic enrollment info (for validation)
     */
    async findBasicEnrollmentInfo(enrollmentId, studentIds) {
        const ids = Array.isArray(studentIds) ? studentIds : [studentIds];
        if (ids.length === 0) return null;

        const placeholders = ids.map(() => '?').join(',');

        const [enrollments] = await db.execute(`
            SELECT id, status, course_id 
            FROM ENROLLMENT 
            WHERE id = ? AND student_id IN (${placeholders})
        `, [enrollmentId, ...ids]);

        return enrollments.length > 0 ? enrollments[0] : null;
    },

    /**
     * Get student statistics
     */
    async findStudentStats(studentIds) {
        const ids = Array.isArray(studentIds) ? studentIds : [studentIds];

        if (ids.length === 0) {
            return null;
        }

        const placeholders = ids.map(() => '?').join(',');

        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total_enrollments,
                COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_courses,
                COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as completed_courses,
                COUNT(CASE WHEN e.status = 'dropped' THEN 1 END) as dropped_courses,
                COUNT(DISTINCT c.mosque_id) as mosques_count,
                AVG(COALESCE(sp.completion_percentage, 0)) as avg_progress
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            LEFT JOIN STUDENT_PROGRESS sp ON e.id = sp.enrollment_id
            WHERE e.student_id IN (${placeholders})
        `, [...ids]);

        return stats.length > 0 ? stats[0] : null;
    },

    /**
     * Withdraw from a course (update status to dropped)
     */
    async withdrawEnrollment(enrollmentId) {
        const [result] = await db.execute(`
            UPDATE ENROLLMENT 
            SET status = 'dropped', 
                completed_at = NOW()
            WHERE id = ?
        `, [enrollmentId]);

        return result;
    },

    /**
     * Get courses filtered by mosque for a student
     */
    async findCoursesByMosque(studentId, mosqueId) {
        const [courses] = await db.execute(`
            SELECT 
                e.id as enrollment_id,
                c.name as course_name,
                c.description,
                ct.name as course_type,
                teacher.full_name as teacher_name,
                e.status,
                sp.completion_percentage
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            LEFT JOIN USER teacher ON c.teacher_id = teacher.id
            LEFT JOIN STUDENT_PROGRESS sp ON e.id = sp.enrollment_id
            WHERE e.student_id = ? AND c.mosque_id = ?
            ORDER BY e.enrollment_date DESC
        `, [studentId, mosqueId]);

        return courses;
    },

    /**
     * Get children for a parent
     */
    async findChildren(parentId) {
        const [children] = await db.execute(`
            SELECT U.id, U.full_name, U.dob, U.email
            FROM PARENT_CHILD_RELATIONSHIP PCR
            JOIN USER U ON PCR.child_id = U.id
            WHERE PCR.parent_id = ? AND PCR.is_verified = TRUE
        `, [parentId]);
        return children;
    },

    /**
     * Verify parent-child relationship
     */
    async verifyParentChildRelationship(parentId, childId) {
        const [rows] = await db.execute(`
            SELECT 1 
            FROM PARENT_CHILD_RELATIONSHIP 
            WHERE parent_id = ? AND child_id = ? AND is_verified = TRUE
        `, [parentId, childId]);
        return rows.length > 0;
    }
};
