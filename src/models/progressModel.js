import db from "../config/db.js";

export const ProgressModel = {

    /**
     * Get level info from course
     */
    async getLevelInfo(enrollmentId) {
        const [rows] = await db.execute(`
            SELECT 
                ml.page_range_start,
                ml.page_range_end,
                ml.level_number,
                ml.level_name
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            LEFT JOIN MEMORIZATION_LEVEL ml ON c.course_level = ml.id
            WHERE e.id = ?
        `, [enrollmentId]);

        if (rows.length === 0) return null;

        const level = rows[0];
        return {
            levelNumber: level.level_number,
            levelName: level.level_name,
            startPage: level.page_range_start,
            endPage: level.page_range_end,
            totalPages: level.page_range_end - level.page_range_start + 1
        };
    },

    /**
     * Calculate completion percentage based on level
     */
    calculateCompletionPercentage(currentPage, levelInfo) {
        if (!levelInfo) return 0;

        const { startPage, endPage } = levelInfo;

        // Ensure current page is within level range
        if (currentPage < startPage) return 0;
        if (currentPage >= endPage) return 100;

        // Formula: (currentPage - levelStart) / (levelEnd - levelStart) * 100
        const percentage = ((currentPage - startPage) / (endPage - startPage)) * 100;
        return Math.round(percentage);
    },

    /**
     * Get exam checkpoints for a level (at 20%, 40%, 60%, 80%, 100%)
     */

    /**
 * Determine which exam checkpoint is reached
 * Returns null if no checkpoint, or 1-5 for exam number
 */

    // if fixed store in database then fetch them  -> future work
    getExamCheckpoints(levelInfo) {
        const { startPage, endPage, totalPages } = levelInfo;

        const chunkSize = Math.floor(totalPages / 5);

        const checkpoints = [];
        let currentStart = startPage;

        for (let i = 1; i <= 5; i++) {
            let currentEnd;

            if (i === 5) {
                // last exam takes all remaining pages
                currentEnd = endPage;
            } else {
                currentEnd = currentStart + chunkSize - 1;
            }

            checkpoints.push({
                examNumber: i,
                percentage: i * 20,
                examPage: currentEnd,
                pageRange: {
                    start: currentStart,
                    end: currentEnd
                }
            });

            currentStart = currentEnd + 1;
        }

        return checkpoints;
    },


    /**
     * Check if current page is an exam checkpoint
     */
    getExamCheckpoint(currentPage, levelInfo) {
        if (!levelInfo) return null;

        const checkpoints = this.getExamCheckpoints(levelInfo);
        const checkpoint = checkpoints.find(cp => cp.examPage === currentPage);

        return checkpoint ? checkpoint.examNumber : null;
    },

    /**
     * Update current page with level-aware progress
     */

    async updateCurrentPage(enrollmentId, currentPage, notes = null) {
        // Get level info
        const levelInfo = await this.getLevelInfo(enrollmentId);

        if (!levelInfo) {
            throw new Error('Level information not found for this course');
        }

        // Validate page is within level range
        if (currentPage < levelInfo.startPage || currentPage > levelInfo.endPage) {
            throw new Error(
                `Page must be between ${levelInfo.startPage} and ${levelInfo.endPage} for ${levelInfo.levelName}`
            );
        }

        // Calculate completion percentage
        const completionPercentage = this.calculateCompletionPercentage(currentPage, levelInfo);

        // Update progress
        await db.execute(`
            UPDATE STUDENT_PROGRESS 
            SET current_page = ?,
                completion_percentage = ?,
                level_start_page = ?,
                level_end_page = ?,
                teacher_notes = COALESCE(?, teacher_notes),
                updated_at = NOW()
            WHERE enrollment_id = ?
        `, [
            currentPage,
            completionPercentage,
            levelInfo.startPage,
            levelInfo.endPage,
            notes,
            enrollmentId
        ]);

        return {
            currentPage,
            completionPercentage,
            levelInfo
        };
    },

    /**
     * Check if all exams passed for final exam eligibility
     */
    async checkFinalExamEligibility(enrollmentId) {
        const [rows] = await db.execute(`
            SELECT 
                sp.exam_1_score, sp.exam_2_score, sp.exam_3_score, 
                sp.exam_4_score, sp.exam_5_score, 
                sp.current_page, sp.level_end_page

                --  sp.current_page, sp.level_end_page how to store them ? 
                --  join enrollment join course course_level -> join memorization_level get them -> getLevelInfo()
            FROM STUDENT_PROGRESS sp
            WHERE sp.enrollment_id = ?
        `, [enrollmentId]);

        if (rows.length === 0) return false;

        const progress = rows[0];

        // Check all exams passed and reached end of level
        return progress.exam_1_score >= 90 &&
            progress.exam_2_score >= 90 &&
            progress.exam_3_score >= 90 &&
            progress.exam_4_score >= 90 &&
            progress.exam_5_score >= 90 &&
            progress.current_page === progress.level_end_page;
    },

    /**
     * Record exam with level awareness
     */
    async recordExam(enrollmentId, examNumber, score, notes, teacherId) {
        // Get level info to validate exam
        const levelInfo = await this.getLevelInfo(enrollmentId);
        const checkpoints = this.getExamCheckpoints(levelInfo);
        const examCheckpoint = checkpoints.find(cp => cp.examNumber === examNumber);

        if (!examCheckpoint) {
            throw new Error('Invalid exam number for this level');
        }

        const passed = score >= 90;
        const examField = `exam_${examNumber}_score`;
        const dateField = `exam_${examNumber}_date`;
        const notesField = `exam_${examNumber}_notes`;

        // Update STUDENT_PROGRESS table
        await db.execute(`
            UPDATE STUDENT_PROGRESS 
            SET ${examField} = ?,
                ${dateField} = CURDATE(),
                ${notesField} = ?,
                updated_at = NOW()
            WHERE enrollment_id = ?
        `, [score, notes, enrollmentId]);

        // Record in milestone history with page range
        await db.execute(`
            INSERT INTO PROGRESS_MILESTONE_HISTORY 
            (enrollment_id, milestone_type, score, passed, notes, recorded_by)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            enrollmentId,
            `exam_${examNumber}`,
            score,
            passed,
            `Pages ${examCheckpoint.pageRange.start}-${examCheckpoint.pageRange.end}: ${notes || ''}`,
            teacherId
        ]);

        return {
            passed,
            score,
            pageRange: examCheckpoint.pageRange,
            examPage: examCheckpoint.page
        };
    },



    /**
     * Record final graduation exam
     */
    async recordFinalExam(enrollmentId, score, notes, teacherId) {
        const passed = score >= 85;

        await db.execute(`
            UPDATE STUDENT_PROGRESS 
            SET final_exam_score = ?,
                final_exam_date = CURDATE(),
                final_exam_notes = ?,
                updated_at = NOW()
            WHERE enrollment_id = ?
        `, [score, notes, enrollmentId]);

        // Record milestone
        await db.execute(`
            INSERT INTO PROGRESS_MILESTONE_HISTORY 
            (enrollment_id, milestone_type, score, passed, notes, recorded_by)
            VALUES (?, 'final_exam', ?, ?, ?, ?)
        `, [enrollmentId, score, passed, notes, teacherId]);

        return passed;
    },

    /**
     * Mark student as graduated
     */
    async markGraduated(enrollmentId) {
        await db.execute(`
            UPDATE STUDENT_PROGRESS 
            SET is_graduated = TRUE,
                graduation_date = CURDATE(),
                completion_percentage = 100
            WHERE enrollment_id = ?
        `, [enrollmentId]);

        await db.execute(`
            UPDATE ENROLLMENT 
            SET status = 'completed',
                completed_at = NOW()
            WHERE id = ?
        `, [enrollmentId]);

        // Record graduation milestone
        const [student] = await db.execute(`
            SELECT recorded_by FROM PROGRESS_MILESTONE_HISTORY 
            WHERE enrollment_id = ? AND milestone_type = 'final_exam'
            ORDER BY achieved_at DESC LIMIT 1
        `, [enrollmentId]);

        const teacherId = student[0]?.recorded_by;

        await db.execute(`
            INSERT INTO PROGRESS_MILESTONE_HISTORY 
            (enrollment_id, milestone_type, score, passed, recorded_by)
            VALUES (?, 'graduation', 100, TRUE, ?)
        `, [enrollmentId, teacherId]);
    },

    /**
     * Mark attendance for non-memorization courses
     */
    async markAttendance(enrollmentId, attendanceDate, status, notes, teacherId) {
        await db.execute(`
            INSERT INTO COURSE_ATTENDANCE 
            (enrollment_id, attendance_date, status, notes, recorded_by)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                status = VALUES(status),
                notes = VALUES(notes)
        `, [enrollmentId, attendanceDate, status, notes, teacherId]);

        // Update completion percentage
        await this.updateAttendanceProgress(enrollmentId);
    },

    /**
     * Calculate and update attendance-based progress
     */
    async updateAttendanceProgress(enrollmentId) {
        // Get total sessions from course
        const [courseInfo] = await db.execute(`
            SELECT c.total_sessions
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            WHERE e.id = ?
        `, [enrollmentId]);

        if (courseInfo.length === 0 || !courseInfo[0].total_sessions) return;

        const totalSessions = courseInfo[0].total_sessions;

        // Count present sessions
        const [attendanceCount] = await db.execute(`
            SELECT COUNT(*) as present_count
            FROM COURSE_ATTENDANCE
            WHERE enrollment_id = ? AND status = 'present'
        `, [enrollmentId]);

        const presentCount = attendanceCount[0].present_count;
        const percentage = Math.round((presentCount / totalSessions) * 100);

        // Update progress
        await db.execute(`
            UPDATE STUDENT_PROGRESS 
            SET completion_percentage = ?,
                updated_at = NOW()
            WHERE enrollment_id = ?
        `, [percentage, enrollmentId]);
    },

    /**
     * Get attendance statistics
     */
    async getAttendanceStats(enrollmentId) {
        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total_recorded,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused_count
            FROM COURSE_ATTENDANCE
            WHERE enrollment_id = ?
        `, [enrollmentId]);

        const [courseInfo] = await db.execute(`
            SELECT c.total_sessions
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            WHERE e.id = ?
        `, [enrollmentId]);

        const totalSessions = courseInfo[0]?.total_sessions || 0;
        const presentCount = stats[0].present_count;
        const percentage = totalSessions > 0
            ? Math.round((presentCount / totalSessions) * 100)
            : 0;

        return {
            ...stats[0],
            totalSessions,
            completionPercentage: percentage
        };
    },

    /**
     * Get complete progress details
     */
    async getProgressDetails(enrollmentId) {
        const [progress] = await db.execute(`
            SELECT 
                sp.id,
                sp.enrollment_id,
                sp.completion_percentage,
                sp.is_graduated,
                sp.graduation_date,
                sp.updated_at,
                e.student_id,
                e.course_id,
                c.name as course_name,
                c.course_type_id,
                ct.name as course_type,
                u.full_name as student_name
            FROM STUDENT_PROGRESS sp
            JOIN ENROLLMENT e ON sp.enrollment_id = e.id
            JOIN COURSE c ON e.course_id = c.id
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            JOIN USER u ON e.student_id = u.id
            WHERE sp.enrollment_id = ?
        `, [enrollmentId]);

        if (progress.length === 0) return null;

        const progressData = progress[0];

        // If memorization course, include exam details
        if (progressData.course_type === 'memorization') {
            const level_info = await ProgressModel.getLevelInfo(enrollmentId);
            return {
                ...progressData,
                level_info,
                exams: {
                    exam_1: {
                        score: progressData.exam_1_score,
                        date: progressData.exam_1_date,
                        notes: progressData.exam_1_notes,
                        passed: progressData.exam_1_score >= 90
                    },
                    exam_2: {
                        score: progressData.exam_2_score,
                        date: progressData.exam_2_date,
                        notes: progressData.exam_2_notes,
                        passed: progressData.exam_2_score >= 90
                    },
                    exam_3: {
                        score: progressData.exam_3_score,
                        date: progressData.exam_3_date,
                        notes: progressData.exam_3_notes,
                        passed: progressData.exam_3_score >= 90
                    },
                    exam_4: {
                        score: progressData.exam_4_score,
                        date: progressData.exam_4_date,
                        notes: progressData.exam_4_notes,
                        passed: progressData.exam_4_score >= 90
                    },
                    exam_5: {
                        score: progressData.exam_5_score,
                        date: progressData.exam_5_date,
                        notes: progressData.exam_5_notes,
                        passed: progressData.exam_5_score >= 90
                    },
                    final_exam: {
                        score: progressData.final_exam_score,
                        date: progressData.final_exam_date,
                        notes: progressData.final_exam_notes,
                        passed: progressData.final_exam_score >= 90
                    }
                }
            };
        }

        // If attendance-based course, include attendance stats
        const attendanceStats = await this.getAttendanceStats(enrollmentId);

        return {
            ...progressData,
            attendance: attendanceStats
        };
    },

    /**
 * Get attendance statistics
 */
    // async getAttendanceStats(enrollmentId) {
    //     // 1. Get summary stats
    //     const [stats] = await db.execute(`
    //         SELECT 
    //             COUNT(*) as total_recorded,
    //             SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
    //             SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
    //             SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused_count
    //         FROM COURSE_ATTENDANCE
    //         WHERE enrollment_id = ?
    //     `, [enrollmentId]);

    //     // 2. Get course info for total sessions
    //     const [courseInfo] = await db.execute(`
    //         SELECT c.total_sessions
    //         FROM ENROLLMENT e
    //         JOIN COURSE c ON e.course_id = c.id
    //         WHERE e.id = ?
    //     `, [enrollmentId]);

    //     // 3. NEW: Get the actual list of records
    //     const [records] = await db.execute(`
    //         SELECT attendance_date, status, notes
    //         FROM COURSE_ATTENDANCE
    //         WHERE enrollment_id = ?
    //         ORDER BY attendance_date DESC
    //     `, [enrollmentId]);

    //     const totalSessions = courseInfo[0]?.total_sessions || 0;
    //     const presentCount = stats[0].present_count;
    //     const percentage = totalSessions > 0
    //         ? Math.round((presentCount / totalSessions) * 100)
    //         : 0;

    //     return {
    //         ...stats[0],
    //         totalSessions,
    //         completionPercentage: percentage,
    //         records: records // <--- This was missing
    //     };
    // },

    /**
     * Get milestone history (exams only)
     */
    async getMilestoneHistory(enrollmentId) {
        const [history] = await db.execute(`
            SELECT 
                pmh.*,
                u.full_name as recorded_by_name
            FROM PROGRESS_MILESTONE_HISTORY pmh
            JOIN USER u ON pmh.recorded_by = u.id
            WHERE pmh.enrollment_id = ?
            ORDER BY pmh.achieved_at DESC
        `, [enrollmentId]);

        return history;
    }
};

