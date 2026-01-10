// Parent Progress Model - Backend
// Database operations for parent viewing children's progress

import db from '../config/db.js';

export const ParentProgressModel = {

    /**
     * Get all verified children for a parent
     * Returns basic info plus enrollment counts
     */
    async getParentChildren(parentId) {
    // Get children with basic info
    const [children] = await db.execute(`
        SELECT 
            u.id as child_id,
            u.full_name,
            u.email,
            u.phone,
            u.dob,
            TIMESTAMPDIFF(YEAR, u.dob, CURDATE()) as age,
            COUNT(DISTINCT e.id) as total_enrollments,
            COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.id END) as active_enrollments,
            COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) as completed_enrollments
        FROM PARENT_CHILD_RELATIONSHIP pcr
        JOIN USER u ON pcr.child_id = u.id
        LEFT JOIN ENROLLMENT e ON u.id = e.student_id
        WHERE pcr.parent_id = ? AND pcr.is_verified = TRUE
        GROUP BY u.id
        ORDER BY u.full_name ASC
    `, [parentId]);

    // Calculate correct average for each child
    for (const child of children) {
        const [enrollments] = await db.execute(`
            SELECT 
                ct.name as course_type,
                sp.completion_percentage,
                (SELECT COUNT(*) FROM COURSE_ATTENDANCE ca 
                 WHERE ca.enrollment_id = e.id AND ca.status = 'present') as present_count,
                (SELECT COUNT(*) FROM COURSE_ATTENDANCE ca 
                 WHERE ca.enrollment_id = e.id) as total_sessions
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            LEFT JOIN STUDENT_PROGRESS sp ON e.id = sp.enrollment_id
            WHERE e.student_id = ? AND e.status = 'active'
        `, [child.child_id]);

        let totalProgress = 0;
        let count = 0;

        enrollments.forEach(enrollment => {
            let progress = 0;
            
            if (enrollment.course_type === 'memorization') {
                progress = enrollment.completion_percentage || 0;
            } else {
                const present = parseInt(enrollment.present_count) || 0;
                const total = parseInt(enrollment.total_sessions) || 0;
                progress = total > 0 ? Math.round((present / total) * 100) : 0;
            }

            totalProgress += progress;
            count++;
        });

        child.avg_progress = count > 0 ? Math.round(totalProgress / count) : 0;
    }

    return children;
},
    /**
     * Verify parent has access to this enrollment
     * Check if enrollment belongs to parent's child
     */
    async verifyParentAccess(parentId, enrollmentId) {
        const [result] = await db.execute(`
            SELECT e.id
            FROM ENROLLMENT e
            JOIN PARENT_CHILD_RELATIONSHIP pcr ON e.student_id = pcr.child_id
            WHERE e.id = ? AND pcr.parent_id = ? AND pcr.is_verified = TRUE
        `, [enrollmentId, parentId]);

        return result.length > 0;
    },

    /**
     * Verify a child belongs to this parent
     */
    async verifyParentChild(parentId, childId) {
        const [result] = await db.execute(`
            SELECT id
            FROM PARENT_CHILD_RELATIONSHIP
            WHERE parent_id = ? AND child_id = ? AND is_verified = TRUE
        `, [parentId, childId]);

        return result.length > 0;
    },

    /**
     * Get detailed progress for a child's enrollment
     * Same data structure as teacher view but read-only
     */
    async getChildProgressDetails(enrollmentId) {
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

        if (progressRows.length === 0) return null;

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

         // Calculate attendance rate from actual attendance records(example to test)
const presentCount = parseInt(progress.present_count) || 0;  // 1
const totalRecords = parseInt(progress.total_attendance_records) || 0;  // 1
const attendanceRate = totalRecords > 0 
    ? Math.round((presentCount / totalRecords) * 100)  // (1/1) * 100 = 100%
    : 0;

progress.attendance = {
    records: attendanceRecords,
    present_count: presentCount,
    absent_count: parseInt(progress.absent_count) || 0,
    excused_count: parseInt(progress.excused_count) || 0,
    totalSessions: totalRecords,
    completionPercentage: attendanceRate  // 100% (calculated correctly!)
};
        }

        // Add exam scores object for memorization courses
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

        return progress;
    },

    /**
     * Get progress history/milestones for a child
     * Same as teacher view
     */
    async getChildMilestoneHistory(enrollmentId) {
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

        return history;
    },

    /**
     * Get all enrollments for all parent's children
     */
    async getAllChildrenEnrollments(parentId) {
        const [enrollments] = await db.execute(`
            SELECT 
                e.id as enrollment_id,
                e.enrollment_date,
                e.status as enrollment_status,
                u.id as child_id,
                u.full_name as child_name,
                c.id as course_id,
                c.name as course_name,
                ct.name as course_type,
                sp.completion_percentage,
                sp.current_page,
                sp.is_graduated,
                t.full_name as teacher_name,
                m.name as mosque_name
            FROM ENROLLMENT e
            JOIN PARENT_CHILD_RELATIONSHIP pcr ON e.student_id = pcr.child_id
            JOIN USER u ON pcr.child_id = u.id
            JOIN COURSE c ON e.course_id = c.id
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            LEFT JOIN STUDENT_PROGRESS sp ON e.id = sp.enrollment_id
            LEFT JOIN USER t ON c.teacher_id = t.id
            LEFT JOIN MOSQUE m ON c.mosque_id = m.id
            WHERE pcr.parent_id = ? AND pcr.is_verified = TRUE
            ORDER BY u.full_name ASC, e.enrollment_date DESC
        `, [parentId]);

        return enrollments;
    },

    /**
     * Get progress summary for all children
     * Dashboard overview data
     */
    async getChildrenProgressSummary(parentId) {
        // Get children summary
        const [childrenSummary] = await db.execute(`
            SELECT 
                COUNT(DISTINCT pcr.child_id) as total_children,
                COUNT(DISTINCT e.id) as total_enrollments,
                COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.id END) as active_enrollments,
                COUNT(DISTINCT CASE WHEN sp.is_graduated = TRUE THEN e.id END) as graduated_count,
                COALESCE(AVG(sp.completion_percentage), 0) as avg_progress
            FROM PARENT_CHILD_RELATIONSHIP pcr
            LEFT JOIN ENROLLMENT e ON pcr.child_id = e.student_id
            LEFT JOIN STUDENT_PROGRESS sp ON e.id = sp.enrollment_id
            WHERE pcr.parent_id = ? AND pcr.is_verified = TRUE
        `, [parentId]);

        // Get recent milestones across all children
        const [recentMilestones] = await db.execute(`
            SELECT 
                pm.milestone_type,
                pm.score,
                pm.achieved_at,
                u.full_name as child_name,
                c.name as course_name
            FROM progress_milestone_history pm
            JOIN ENROLLMENT e ON pm.enrollment_id = e.id
            JOIN PARENT_CHILD_RELATIONSHIP pcr ON e.student_id = pcr.child_id
            JOIN USER u ON pcr.child_id = u.id
            JOIN COURSE c ON e.course_id = c.id
            WHERE pcr.parent_id = ? AND pcr.is_verified = TRUE
            ORDER BY pm.achieved_at DESC
            LIMIT 10
        `, [parentId]);

        return {
            summary: childrenSummary[0],
            recentMilestones
        };
    },

    /**
     * Get overview for a specific child
     * All courses and progress for one child
     */
    async getChildOverview(childId) {
        // Get child info
        const [childInfo] = await db.execute(`
            SELECT 
                id,
                full_name,
                email,
                phone,
                dob,
                TIMESTAMPDIFF(YEAR, dob, CURDATE()) as age
            FROM USER
            WHERE id = ?
        `, [childId]);

        if (childInfo.length === 0) return null;

        // Get all enrollments for this child
       // Get all enrollments for this child
        const [enrollments] = await db.execute(`
            SELECT 
                e.id as enrollment_id,
                e.enrollment_date,
                e.status,
                c.name as course_name,
                ct.name as course_type,
                sp.completion_percentage,
                sp.current_page,
                sp.is_graduated,
                t.full_name as teacher_name,
                m.name as mosque_name,
                -- Exam summary for memorization
                (CASE WHEN sp.exam_1_score >= 90 THEN 1 ELSE 0 END +
                 CASE WHEN sp.exam_2_score >= 90 THEN 1 ELSE 0 END +
                 CASE WHEN sp.exam_3_score >= 90 THEN 1 ELSE 0 END +
                 CASE WHEN sp.exam_4_score >= 90 THEN 1 ELSE 0 END +
                 CASE WHEN sp.exam_5_score >= 90 THEN 1 ELSE 0 END) as exams_passed,
                -- Attendance summary for non-memorization
                (SELECT COUNT(*) FROM COURSE_ATTENDANCE ca 
                 WHERE ca.enrollment_id = e.id AND ca.status = 'present') as present_count,
                (SELECT COUNT(*) FROM COURSE_ATTENDANCE ca 
                 WHERE ca.enrollment_id = e.id) as total_sessions
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            LEFT JOIN STUDENT_PROGRESS sp ON e.id = sp.enrollment_id
            LEFT JOIN USER t ON c.teacher_id = t.id
            LEFT JOIN MOSQUE m ON c.mosque_id = m.id
            WHERE e.student_id = ?
            ORDER BY e.enrollment_date DESC
        `, [childId]);

        // ✅ CALCULATE CORRECT PROGRESS FOR EACH ENROLLMENT
        const processedEnrollments = enrollments.map(enrollment => {
            let progress = 0;
            
            if (enrollment.course_type === 'memorization') {
                // For memorization: use completion_percentage
                progress = enrollment.completion_percentage || 0;
            } else {
                // For other courses: calculate from attendance
                const present = parseInt(enrollment.present_count) || 0;
                const total = parseInt(enrollment.total_sessions) || 0;
                progress = total > 0 ? Math.round((present / total) * 100) : 0;
            }

            return {
                ...enrollment,
                progress  // Add calculated progress field
            };
        });

        return {
            child: childInfo[0],
            enrollments: processedEnrollments  // ✅ Use processed enrollments
        };
    }
};