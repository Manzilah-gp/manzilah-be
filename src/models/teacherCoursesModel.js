// src/models/teacherCoursesModel.js
import db from "../config/db.js";

export const TeacherCoursesModel = {
    /**
     * Get all courses taught by a teacher
     */
    async getTeacherCourses(teacherId) {
        const [courses] = await db.execute(`
            SELECT 
                c.id as course_id,
                c.name as course_name,
                c.description,
                c.course_start_date,
                c.course_end_date,
                c.is_active,
                c.is_online_enabled,
                c.schedule_type,
                ct.name as course_type,
                m.name as mosque_name,
                m.id as mosque_id,
                -- Count enrolled students
                COUNT(DISTINCT e.student_id) as total_students,
                -- Count active enrollments
                COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.student_id END) as active_students
            FROM COURSE c
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            JOIN MOSQUE m ON c.mosque_id = m.id
            LEFT JOIN ENROLLMENT e ON c.id = e.course_id
            WHERE c.teacher_id = ? AND c.is_active = TRUE
            GROUP BY c.id
            ORDER BY c.course_start_date DESC
        `, [teacherId]);

        // Get schedule for each course
        for (const course of courses) {
            const [schedules] = await db.execute(`
                SELECT day_of_week, start_time, end_time, location
                FROM COURSE_SCHEDULE
                WHERE course_id = ?
                ORDER BY FIELD(day_of_week, 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')
            `, [course.course_id]);
            course.schedule = schedules;
        }

        return courses;
    },

    /**
     * Get all students enrolled in a specific course
     */
    async getCourseStudents(courseId, teacherId) {
        // Verify teacher owns this course
        const [courseCheck] = await db.execute(
            'SELECT id FROM COURSE WHERE id = ? AND teacher_id = ?',
            [courseId, teacherId]
        );

        if (courseCheck.length === 0) {
            throw new Error('Unauthorized: You do not teach this course');
        }

        const [students] = await db.execute(`
            SELECT 
                u.id as student_id,
                u.full_name,
                u.email,
                u.phone,
                e.id as enrollment_id,
                e.status as enrollment_status,
                e.enrollment_date,
                sp.completion_percentage,
                sp.current_page,
                sp.exam_1_score,
                sp.exam_2_score,
                sp.exam_3_score,
                sp.exam_4_score,
                sp.exam_5_score,
                sp.final_exam_score,
                sp.is_graduated,
                -- Calculate attendance rate for non-memorization courses
                (SELECT COUNT(*) FROM COURSE_ATTENDANCE ca 
                 WHERE ca.enrollment_id = e.id AND ca.status = 'present') as present_count,
                (SELECT COUNT(*) FROM COURSE_ATTENDANCE ca 
                 WHERE ca.enrollment_id = e.id) as total_attendance_records
            FROM ENROLLMENT e
            JOIN USER u ON e.student_id = u.id
            LEFT JOIN STUDENT_PROGRESS sp ON e.id = sp.enrollment_id
            WHERE e.course_id = ? AND e.status = 'active'
            ORDER BY u.full_name ASC
        `, [courseId]);

        return students;
    },

    /**
     * Get all students across all teacher's courses
     */
    async getAllTeacherStudents(teacherId, filters = {}) {
        const { courseId, search, minProgress, maxProgress } = filters;

        let query = `
            SELECT 
                u.id as student_id,
                u.full_name,
                u.email,
                u.phone,
                c.id as course_id,
                c.name as course_name,
                c.total_sessions,
                ct.name as course_type,
                e.id as enrollment_id,
                e.status as enrollment_status,
                e.enrollment_date,
                sp.completion_percentage,
                sp.current_page,
                sp.exam_1_score,
                sp.exam_2_score,
                sp.exam_3_score,
                sp.exam_4_score,
                sp.exam_5_score,
                sp.final_exam_score,
                sp.is_graduated,
                -- Count exams passed (score >= 90)
                (CASE WHEN sp.exam_1_score >= 90 THEN 1 ELSE 0 END +
                 CASE WHEN sp.exam_2_score >= 90 THEN 1 ELSE 0 END +
                 CASE WHEN sp.exam_3_score >= 90 THEN 1 ELSE 0 END +
                 CASE WHEN sp.exam_4_score >= 90 THEN 1 ELSE 0 END +
                 CASE WHEN sp.exam_5_score >= 90 THEN 1 ELSE 0 END) as exams_passed,
                -- Attendance stats
                (SELECT COUNT(*) FROM COURSE_ATTENDANCE ca 
                 WHERE ca.enrollment_id = e.id AND ca.status = 'present') as present_count,
                (SELECT COUNT(*) FROM COURSE_ATTENDANCE ca 
                 WHERE ca.enrollment_id = e.id) as total_attendance_records
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            JOIN USER u ON e.student_id = u.id
            LEFT JOIN STUDENT_PROGRESS sp ON e.id = sp.enrollment_id
            WHERE c.teacher_id = ? AND e.status = 'active'
        `;

        const params = [teacherId];

        // Apply filters
        if (courseId) {
            query += ' AND c.id = ?';
            params.push(courseId);
        }

        if (search) {
            query += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY u.full_name ASC';

        const [students] = await db.execute(query, params);

        // Filter by progress if specified
        let filteredStudents = students;
        if (minProgress !== undefined || maxProgress !== undefined) {
            filteredStudents = students.filter(s => {
                const progress = s.completion_percentage || 0;
                if (minProgress !== undefined && progress < minProgress) return false;
                if (maxProgress !== undefined && progress > maxProgress) return false;
                return true;
            });
        }

        return filteredStudents;
    },

    /**
     * Get students for a specific session date
     */
    async getStudentsForSession(courseId, sessionDate, teacherId) {
        // Verify teacher owns course
        const [courseCheck] = await db.execute(
            'SELECT id FROM COURSE WHERE id = ? AND teacher_id = ?',
            [courseId, teacherId]
        );

        if (courseCheck.length === 0) {
            throw new Error('Unauthorized');
        }

        const [students] = await db.execute(`
            SELECT 
                u.id as student_id,
                u.full_name,
                u.email,
                u.phone,
                e.id as enrollment_id,
                -- Check if attendance already marked for this date
                ca.status as attendance_status,
                ca.notes as attendance_notes
            FROM ENROLLMENT e
            JOIN USER u ON e.student_id = u.id
            LEFT JOIN COURSE_ATTENDANCE ca ON e.id = ca.enrollment_id 
                AND ca.attendance_date = ?
            WHERE e.course_id = ? AND e.status = 'active'
            ORDER BY u.full_name ASC
        `, [sessionDate, courseId]);

        return students;
    },

    /**
     * Bulk mark attendance for multiple students
     */
    async bulkMarkAttendance(attendanceRecords, teacherId) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            for (const record of attendanceRecords) {
                const { enrollmentId, attendanceDate, status, notes } = record;

                await connection.execute(`
                    INSERT INTO COURSE_ATTENDANCE 
                    (enrollment_id, attendance_date, status, notes, recorded_by)
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        status = VALUES(status),
                        notes = VALUES(notes),
                        recorded_by = VALUES(recorded_by)
                `, [enrollmentId, attendanceDate, status, notes, teacherId]);
            }

            await connection.commit();
            return { success: true, recordsUpdated: attendanceRecords.length };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};