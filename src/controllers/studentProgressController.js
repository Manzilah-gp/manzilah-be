// Student Progress Controller - Backend
// Allows students to view their own progress


import db from '../config/db.js';

/**
 * Get student's own progress for a specific enrollment
 * Similar to parent view but student can only see their own data
 */
export const getMyProgress = async (req, res) => {
    try {
        const studentId = req.user.id;  // From auth token
        const { enrollmentId } = req.params;

        // Verify this enrollment belongs to the student
        const [enrollmentCheck] = await db.execute(`
            SELECT id FROM ENROLLMENT
            WHERE id = ? AND student_id = ?
        `, [enrollmentId, studentId]);

        if (enrollmentCheck.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this enrollment'
            });
        }

        // Get detailed progress (same query as parent view)
        const [progressRows] = await db.execute(`
            SELECT 
                sp.*,
                e.student_id,
                e.course_id,
                e.enrollment_date,
                e.status as enrollment_status,
                u.full_name as student_name,
                u.email as student_email,
                c.name as course_name,
                ct.name as course_type,
                c.total_sessions,
                -- Memorization level info
                ml.level_name,
                ml.level_number,
                ml.page_range_start,
                ml.page_range_end,
                -- Teacher info
                t.full_name as teacher_name,
                -- Attendance stats for non-memorization courses
                (SELECT COUNT(*) FROM COURSE_ATTENDANCE ca 
                 WHERE ca.enrollment_id = e.id AND ca.status = 'present') as present_count,
                (SELECT COUNT(*) FROM COURSE_ATTENDANCE ca 
                 WHERE ca.enrollment_id = e.id AND ca.status = 'absent') as absent_count,
                (SELECT COUNT(*) FROM COURSE_ATTENDANCE ca 
                 WHERE ca.enrollment_id = e.id AND ca.status = 'excused') as excused_count,
                (SELECT COUNT(*) FROM COURSE_ATTENDANCE ca 
                 WHERE ca.enrollment_id = e.id) as total_attendance_records
            FROM STUDENT_PROGRESS sp
            JOIN ENROLLMENT e ON sp.enrollment_id = e.id
            JOIN USER u ON e.student_id = u.id
            JOIN COURSE c ON e.course_id = c.id
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            LEFT JOIN USER t ON c.teacher_id = t.id
            LEFT JOIN MEMORIZATION_LEVEL ml ON c.course_level = ml.id
            WHERE e.id = ?
        `, [enrollmentId]);

        if (progressRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Progress record not found'
            });
        }

        const progress = progressRows[0];

        // Get attendance records for calendar display
        if (progress.course_type !== 'memorization') {
            const [attendanceRecords] = await db.execute(`
                SELECT 
                    attendance_date,
                    status,
                    notes
                FROM COURSE_ATTENDANCE
                WHERE enrollment_id = ?
                ORDER BY attendance_date DESC
            `, [enrollmentId]);

            // Calculate attendance rate
            const presentCount = parseInt(progress.present_count) || 0;
            const totalRecords = parseInt(progress.total_attendance_records) || 0;
            const attendanceRate = totalRecords > 0 
                ? Math.round((presentCount / totalRecords) * 100) 
                : 0;

            progress.attendance = {
                records: attendanceRecords,
                present_count: presentCount,
                absent_count: parseInt(progress.absent_count) || 0,
                excused_count: parseInt(progress.excused_count) || 0,
                totalSessions: totalRecords,
                completionPercentage: attendanceRate
            };
        }

        // Add exam scores for memorization courses
        if (progress.course_type === 'memorization') {
            progress.exams = {
                exam_1_score: progress.exam_1_score,
                exam_2_score: progress.exam_2_score,
                exam_3_score: progress.exam_3_score,
                exam_4_score: progress.exam_4_score,
                exam_5_score: progress.exam_5_score,
                final_exam_score: progress.final_exam_score
            };

            progress.level_info = {
                level_name: progress.level_name,
                level_number: progress.level_number,
                page_range_start: progress.page_range_start,
                page_range_end: progress.page_range_end
            };
        }

        res.status(200).json({
            success: true,
            data: progress
        });

    } catch (error) {
        console.error('Error fetching student progress:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch progress',
            error: error.message
        });
    }
};

/**
 * Get progress history for student's enrollment
 */
export const getMyProgressHistory = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { enrollmentId } = req.params;

        // Verify enrollment belongs to student
        const [enrollmentCheck] = await db.execute(`
            SELECT id FROM ENROLLMENT
            WHERE id = ? AND student_id = ?
        `, [enrollmentId, studentId]);

        if (enrollmentCheck.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this enrollment'
            });
        }

        // Get milestone history
        const [history] = await db.execute(`
            SELECT 
                pm.id,
                pm.milestone_type,
                pm.score,
                pm.notes,
                pm.achieved_at,
                pm.passed,
                u.full_name as recorded_by_name
            FROM progress_milestone_history pm
            LEFT JOIN USER u ON pm.recorded_by = u.id
            WHERE pm.enrollment_id = ?
            ORDER BY pm.achieved_at DESC
        `, [enrollmentId]);

        res.status(200).json({
            success: true,
            data: history
        });

    } catch (error) {
        console.error('Error fetching progress history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch progress history',
            error: error.message
        });
    }
};