// backend/models/statisticsModel.js
import db from "../config/db.js";

/**
 * DashboardModel - Database queries for dashboard statistics
 * Based on the actual schema from currentSQL.sql
 */
export const StatisticsModel = {

    // ==================== MINISTRY ADMIN QUERIES ====================

    /**
     * Get total number of mosques in the system
     */
    async getTotalMosques() {
        try {
            const [rows] = await db.execute("SELECT COUNT(*) as count FROM MOSQUE");
            return rows[0]?.count || 0;
        } catch (error) {
            console.error("Error in getTotalMosques:", error.message);
            return 0;
        }
    },

    /**
     * Get total students (users with student role)
     * Uses ROLE_ASSIGNMENT table to count active students
     */
    async getTotalStudentsByRole() {
        const [rows] = await db.execute(`
            SELECT COUNT(DISTINCT ra.user_id) as count
            FROM ROLE_ASSIGNMENT ra
            JOIN ROLE r ON ra.role_id = r.id
            WHERE r.name = 'student' 
            AND ra.is_active = TRUE
        `);
        return rows[0].count;
    },

    /**
     * Get total teachers (users with teacher role)
     * Uses ROLE_ASSIGNMENT table to count active teachers
     */
    async getTotalTeachersByRole() {
        const [rows] = await db.execute(`
            SELECT COUNT(DISTINCT ra.user_id) as count
            FROM ROLE_ASSIGNMENT ra
            JOIN ROLE r ON ra.role_id = r.id
            WHERE r.name = 'teacher' 
            AND ra.is_active = TRUE
        `);
        return rows[0].count;
    },

    /**
     * Get total courses across all mosques
     * Only counts active courses
     */
    async getTotalCourses() {
        const [rows] = await db.execute(
            "SELECT COUNT(*) as count FROM COURSE WHERE is_active = TRUE"
        );
        return rows[0].count;
    },

    /**
     * Get total active enrollments
     * Counts students currently enrolled in active courses
     */
    async getActiveEnrollments() {
        const [rows] = await db.execute(
            "SELECT COUNT(*) as count FROM ENROLLMENT WHERE status = 'active'"
        );
        return rows[0].count;
    },

    /**
     * Get recently added mosques with their details
     * Includes mosque location and admin information
     */
    async getRecentMosques(limit = 5) {
        console.log("getRecentMosques called - limit:", limit);

        try {
            // ✅ Validate and convert to integer
            const limitInt = parseInt(limit, 10);

            // ✅ Use string interpolation for LIMIT (safe because we validated it's an integer)
            const [mosques] = await db.execute(`
        SELECT 
            m.id,
            m.name,
            m.contact_number,
            ml.governorate,
            ml.region,
            ml.address,
            m.created_at,
            u.full_name as admin_name,
            creator.full_name as created_by_name
        FROM MOSQUE m
        LEFT JOIN MOSQUE_LOCATION ml ON m.id = ml.mosque_id
        LEFT JOIN USER u ON m.mosque_admin_id = u.id
        LEFT JOIN USER creator ON m.created_by = creator.id
        ORDER BY m.created_at DESC
        LIMIT ${limitInt}
    `); // ✅ No parameters needed now

            console.log("Found mosques:", mosques.length);
            return mosques || [];
        } catch (error) {
            console.error("Error in getRecentMosques:", error);
            throw error;
        }
    },//Error


    /**
     * Get mosque count grouped by governorate
     * Used for chart visualization
     */
    async getMosqueCountByGovernorate() {
        const [rows] = await db.execute(`
            SELECT 
                ml.governorate,
                COUNT(m.id) as mosqueCount
            FROM MOSQUE m
            JOIN MOSQUE_LOCATION ml ON m.id = ml.mosque_id
            WHERE ml.governorate IS NOT NULL
            GROUP BY ml.governorate
            ORDER BY mosqueCount DESC
        `);
        return rows;
    },

    /**
     * Get system-wide statistics summary
     * Returns counts for mosques, courses, users by role
     */

    // not used !!
    async getSystemSummary() {
        const [rows] = await db.execute(`
            SELECT 
                (SELECT COUNT(*) FROM MOSQUE) as total_mosques,
                (SELECT COUNT(*) FROM COURSE WHERE is_active = TRUE) as total_courses,
                (SELECT COUNT(DISTINCT ra.user_id) FROM ROLE_ASSIGNMENT ra JOIN ROLE r ON ra.role_id = r.id WHERE r.name = 'student' AND ra.is_active = TRUE) as total_students,
                (SELECT COUNT(DISTINCT ra.user_id) FROM ROLE_ASSIGNMENT ra JOIN ROLE r ON ra.role_id = r.id WHERE r.name = 'teacher' AND ra.is_active = TRUE) as total_teachers,
                (SELECT COUNT(*) FROM ENROLLMENT WHERE status = 'active') as active_enrollments
        `);
        return rows[0];
    },

    // ==================== MOSQUE ADMIN QUERIES ====================

    /**
     * Get the mosque ID that a user administers
     * Looks up in Mosque table where user has mosque_admin role
     */
    async getMosqueIdForAdmin(userId) {
        const [rows] = await db.execute(`
            SELECT id FROM MOSQUE WHERE mosque_admin_id = ?
        `, [userId]);
        if (rows.length === 0) {
            return null; // User is not a mosque admin
        }

        return rows.length > 0 ? rows[0].id : null;
    },


    /**
     * Get detailed mosque information
     * Includes location data and admin details
     */
    async getMosqueDetails(mosqueId) {
        const [rows] = await db.execute(`
            SELECT 
                m.id,
                m.name,
                m.contact_number,
                ml.address,
                ml.region,
                ml.governorate,
                ml.postal_code,
                ml.latitude,
                ml.longitude,
                m.created_at,
                u.full_name as admin_name,
                u.email as admin_email,
                u.phone as admin_phone
            FROM MOSQUE m
            LEFT JOIN MOSQUE_LOCATION ml ON m.id = ml.mosque_id
            LEFT JOIN USER u ON m.mosque_admin_id = u.id
            WHERE m.id = ?
        `, [mosqueId]);

        return rows.length > 0 ? rows[0] : null;
    },

    /**
     * Get student count for a specific mosque
     * Counts unique students enrolled in courses at this mosque
     */
    async getStudentCountByMosque(mosqueId) {
        const [rows] = await db.execute(`
            SELECT COUNT(DISTINCT e.student_id) as count
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            WHERE c.mosque_id = ? 
            AND e.status = 'active'
        `, [mosqueId]);

        return rows[0].count;
    },

    /**
     * Get teacher count for a specific mosque
     * Counts unique teachers assigned to courses at this mosque
     */
    async getTeacherCountByMosque(mosqueId) {
        const [rows] = await db.execute(`
            SELECT COUNT(DISTINCT c.teacher_id) as count
            FROM COURSE c
            WHERE c.mosque_id = ?
        `, [mosqueId]);

        return rows[0].count;
    },

    /**
     * Get course count for a specific mosque
     * Only counts active courses
     */
    async getCourseCountByMosque(mosqueId) {
        const [rows] = await db.execute(`
            SELECT COUNT(*) as count
            FROM COURSE
            WHERE mosque_id = ? 
            AND is_active = TRUE
        `, [mosqueId]);

        return rows[0].count;
    },

    /**
     * Get active enrollments for a specific mosque
     * Counts current active enrollments in mosque courses
     */
    async getActiveEnrollmentsByMosque(mosqueId) {
        const [rows] = await db.execute(`
            SELECT COUNT(*) as count
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            WHERE c.mosque_id = ? 
            AND e.status = 'active'
        `, [mosqueId]);

        return rows[0].count;
    },

    /**
     * Get recent enrollments for a mosque
     * Shows latest students who enrolled with course details
     */

    async getRecentEnrollmentsByMosque(mosqueId, limit = 3) {
        //console.log("getRecentEnrollmentsByMosque called - mosqueId:", mosqueId, "limit:", limit);

        try {
            // ✅ Validate and convert to integer
            const limitInt = parseInt(limit, 10);

            // ✅ Validate mosqueId is a valid number
            if (!mosqueId || isNaN(mosqueId)) {
                console.error("Invalid mosqueId:", mosqueId);
                return [];
            }

            // ✅ Use string interpolation for LIMIT (safe because we validated it's an integer)
            const [enrollments] = await db.execute(`
        SELECT 
            e.id,
            e.enrollment_date,
            e.status,
            u.full_name as student_name,
            u.email as student_email,
            c.name as course_name,
            ct.name as course_type,
            teacher.full_name as teacher_name
        FROM ENROLLMENT e
        JOIN USER u ON e.student_id = u.id
        JOIN COURSE c ON e.course_id = c.id
        JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
        LEFT JOIN USER teacher ON c.teacher_id = teacher.id
        WHERE c.mosque_id = ?
        AND e.status = 'active'
        ORDER BY e.enrollment_date DESC
        LIMIT ${limitInt}
    `, [mosqueId]); // ✅ Only mosqueId as parameter

            console.log("Found enrollments:", enrollments.length);
            return enrollments || [];
        } catch (error) {
            console.error("Error in getRecentEnrollmentsByMosque:", error);
            throw error;
        }
    },
    //Error

    /**
     * Get all courses for a specific mosque with enrollment stats
     * Includes course details and number of enrolled students
     */
    async getCoursesByMosque(mosqueId) {
        const [courses] = await db.execute(`
            SELECT 
                c.id,
                c.name,
                c.course_format,
                c.is_active,
                c.price_cents,
                c.duration_weeks,
                c.total_sessions,
                c.max_students,
                c.schedule_type,
                ct.name as course_type,
                ml.level_name as level_name,
                COUNT(DISTINCT e.student_id) as enrolled_students,
                c.created_at,
                creator.full_name as created_by_name
            FROM COURSE c
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            LEFT JOIN MEMORIZATION_LEVEL ml ON c.course_level = ml.id
            LEFT JOIN ENROLLMENT e ON c.id = e.course_id AND e.status = 'active'
            LEFT JOIN USER creator ON c.created_by = creator.id
            WHERE c.mosque_id = ?
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `, [mosqueId]);

        return courses;
    },

    /**
     * Get enrollment trends by course for a mosque
     * Shows which courses are most popular (last 6 months)
     */
    async getEnrollmentTrendsByMosque(mosqueId) {
        const [trends] = await db.execute(`
            SELECT 
                c.id as courseId,
                c.name as courseName,
                ct.name as courseType,
                COUNT(e.id) as enrollmentCount,
                c.max_students,
                ROUND((COUNT(e.id) / c.max_students) * 100, 1) as capacity_percentage
            FROM COURSE c
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            LEFT JOIN ENROLLMENT e ON c.id = e.course_id 
                AND e.status = 'active'
                AND e.enrollment_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            WHERE c.mosque_id = ? 
            AND c.is_active = TRUE
            GROUP BY c.id
            ORDER BY enrollmentCount DESC
        `, [mosqueId]);

        return trends;
    },

    // ==================== TEACHER STATISTICS ====================

    /**
     * Get teacher-specific statistics
     * Shows courses taught and student count
     */
    async getTeacherStatistics(teacherId) {
        const [stats] = await db.execute(`
            SELECT 
                COUNT(DISTINCT e.course_id) as courses_teaching,
                COUNT(DISTINCT e.student_id) as total_students,
                COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.student_id END) as active_students
            FROM ENROLLMENT e
            WHERE c.teacher_id = ?
        `, [teacherId]);

        return stats[0];
    },

    /**
     * Get courses taught by a specific teacher
     */
    async getCoursesByTeacher(teacherId) {
        const [courses] = await db.execute(`
            SELECT DISTINCT
                c.id,
                c.name,
                c.course_format,
                ct.name as course_type,
                m.name as mosque_name,
                COUNT(DISTINCT e.student_id) as enrolled_students
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            JOIN MOSQUE m ON c.mosque_id = m.id
            WHERE c.teacher_id = ?
            GROUP BY c.id
        `, [teacherId]);

        return courses;
    },

    // ==================== STUDENT STATISTICS ====================

    /**
     * Get student-specific statistics
     * Shows enrollments and progress
     */
    async getStudentStatistics(studentId) {
        const [stats] = await db.execute(`
            SELECT 
                COUNT(DISTINCT e.course_id) as total_enrollments,
                COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.course_id END) as active_courses,
                COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.course_id END) as completed_courses,
                AVG(sp.completion_percentage) as avg_progress
            FROM ENROLLMENT e
            LEFT JOIN STUDENT_PROGRESS sp ON e.id = sp.enrollment_id
            WHERE e.student_id = ?
        `, [studentId]);

        return stats[0];
    },

    /**
     * Get student's enrollments with details
     */
    async getStudentEnrollments(studentId) {
        const [enrollments] = await db.execute(`
            SELECT 
                e.id,
                e.enrollment_date,
                e.status,
                c.name as course_name,
                ct.name as course_type,
                m.name as mosque_name,
                teacher.full_name as teacher_name,
                e.current_level
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            JOIN MOSQUE m ON c.mosque_id = m.id
            LEFT JOIN USER teacher ON c.teacher_id = teacher.id
            WHERE e.student_id = ?
            ORDER BY e.enrollment_date DESC
        `, [studentId]);

        return enrollments;
    },

    // ==================== ATTENDANCE STATISTICS ====================

    /**
     * Get attendance statistics for a mosque
     * Shows attendance rates and trends
     */
    async getAttendanceStatsByMosque(mosqueId) {
        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total_sessions,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused_count,
                ROUND((SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as attendance_rate
            FROM ATTENDANCE a
            JOIN ENROLLMENT e ON a.enrollment_id = e.id
            JOIN COURSE c ON e.course_id = c.id
            WHERE c.mosque_id = ?
            AND a.session_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `, [mosqueId]);

        return stats[0];
    },

    /**
     * Get attendance rate for a specific student
     */
    async getStudentAttendanceRate(studentId) {
        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total_sessions,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                ROUND((SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as attendance_rate
            FROM ATTENDANCE a
            JOIN ENROLLMENT e ON a.enrollment_id = e.id
            WHERE e.student_id = ?
        `, [studentId]);

        return stats[0];
    },

    // ==================== PROGRESS TRACKING ====================

    /**
     * Get student progress overview for a mosque
     * Shows average completion and levels completed
     */
    async getStudentProgressByMosque(mosqueId) {
        const [stats] = await db.execute(`
            SELECT 
                COUNT(DISTINCT sp.enrollment_id) as students_tracked,
                AVG(sp.completion_percentage) as avg_completion,
                SUM(CASE WHEN sp.is_level_completed = TRUE THEN 1 ELSE 0 END) as levels_completed
            FROM STUDENT_PROGRESS sp
            JOIN ENROLLMENT e ON sp.enrollment_id = e.id
            JOIN COURSE c ON e.course_id = c.id
            WHERE c.mosque_id = ?
        `, [mosqueId]);

        return stats[0];
    },

    /**
     * Get detailed progress for a student
     */
    async getStudentProgressDetails(studentId) {
        const [progress] = await db.execute(`
            SELECT 
                sp.id,
                c.name as course_name,
                ml.level_name,
                sp.completion_percentage,
                sp.is_level_completed,
                sp.level_completion_date,
                sp.last_activity_date
            FROM STUDENT_PROGRESS sp
            JOIN ENROLLMENT e ON sp.enrollment_id = e.id
            JOIN COURSE c ON e.course_id = c.id
            LEFT JOIN MEMORIZATION_LEVEL ml ON sp.level_id = ml.id
            WHERE e.student_id = ?
            ORDER BY sp.last_activity_date DESC
        `, [studentId]);

        return progress;
    },

    // ==================== HELPER QUERIES ====================

    /**
     * Check if user has specific role
     */
    async userHasRole(userId, roleName) {
        const [rows] = await db.execute(`
            SELECT COUNT(*) as count
            FROM ROLE_ASSIGNMENT ra
            JOIN ROLE r ON ra.role_id = r.id
            WHERE ra.user_id = ? 
            AND r.name = ?
            AND ra.is_active = TRUE
        `, [userId, roleName]);

        return rows[0].count > 0;
    },

    /**
     * Get all roles for a user
     */
    async getUserRoles(userId) {
        const [roles] = await db.execute(`
            SELECT 
                r.name,
                ra.mosque_id,
                m.name as mosque_name
            FROM ROLE_ASSIGNMENT ra
            JOIN ROLE r ON ra.role_id = r.id
            LEFT JOIN MOSQUE m ON ra.mosque_id = m.id
            WHERE ra.user_id = ?
            AND ra.is_active = TRUE
        `, [userId]);

        return roles;
    },
    // Add this method to check database state
    async checkDatabaseState() {
        try {
            console.log("🔍 Checking database state...");

            // Check if tables exist
            const [tables] = await db.execute("SHOW TABLES");
            console.log("Available tables:", tables.map(t => Object.values(t)[0]));

            // Check mosque table
            const [mosques] = await db.execute("SELECT COUNT(*) as count FROM MOSQUE");
            console.log("Total mosques:", mosques[0].count);

            // Check users table
            const [users] = await db.execute("SELECT COUNT(*) as count FROM USER");
            console.log("Total users:", users[0].count);

            // Check enrollments table
            const [enrollments] = await db.execute("SELECT COUNT(*) as count FROM ENROLLMENT");
            console.log("Total enrollments:", enrollments[0].count);

            return {
                tables: tables.map(t => Object.values(t)[0]),
                mosqueCount: mosques[0].count,
                userCount: users[0].count,
                enrollmentCount: enrollments[0].count
            };
        } catch (error) {
            console.error("❌ Database check failed:", error.message);
            return { error: error.message };
        }
    }
};