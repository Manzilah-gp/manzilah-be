import { ProgressModel } from "../models/progressModel.js";

/**
 * Update current page for memorization course
 * Auto-prompts for exam if milestone reached
 */
export const updateMemorizationProgress = async (req, res) => {
    try {
        const { enrollmentId, currentPage, notes } = req.body;

        // Validate page number -> according to the course level 100 0r 604?
        if (currentPage < 0 || currentPage > 604) {
            return res.status(400).json({
                success: false,
                message: "Page number must be between 0 and 604"
            });
        }

        // Update progress
        await ProgressModel.updateCurrentPage(enrollmentId, currentPage, notes);

        // Get level info
        const levelInfo = await ProgressModel.getLevelInfo(enrollmentId);

        // Check if exam checkpoint reached
        const examCheckpoint = ProgressModel.getExamCheckpoint(currentPage, levelInfo);

        res.status(200).json({
            success: true,
            message: "Progress updated successfully",
            data: {
                currentPage,
                completionPercentage: currentPage,
                examCheckpoint: examCheckpoint ? {
                    examNumber: examCheckpoint,
                    message: `Student has reached exam ${examCheckpoint} checkpoint (pages ${(examCheckpoint - 1) * 20 + 1}-${examCheckpoint * 20})`
                } : null
            }
        });

    } catch (error) {
        console.error("Error updating progress:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update progress",
            error: error.message
        });
    }
};

/**
 * Record exam score (exams 1-5)
 */
export const recordExamScore = async (req, res) => {
    try {
        const { enrollmentId, examNumber, score, notes } = req.body;
        const teacherId = req.user.id;

        // Validate
        if (examNumber < 1 || examNumber > 5) {
            return res.status(400).json({
                success: false,
                message: "Exam number must be between 1 and 5"
            });
        }

        if (score < 0 || score > 100) {
            return res.status(400).json({
                success: false,
                message: "Score must be between 0 and 100"
            });
        }

        const passed = score >= 90;

        // Record exam
        await ProgressModel.recordExam(
            enrollmentId,
            examNumber,
            score,
            notes,
            teacherId
        );

        // 🔔 FIREBASE NOTIFICATION: Send notification to student/parent
        // await sendNotification(enrollmentId, {
        //     type: 'exam_result',
        //     examNumber: examNumber,
        //     score: score,
        //     passed: passed
        // });

        res.status(200).json({
            success: true,
            message: `Exam ${examNumber} recorded successfully`,
            data: {
                examNumber,
                score,
                passed,
                message: passed ? "Student passed the exam!" : "Student needs to retake the exam (score must be ≥90)"
            }
        });

    } catch (error) {
        console.error("Error recording exam:", error);
        res.status(500).json({
            success: false,
            message: "Failed to record exam",
            error: error.message
        });
    }
};

/**
 * Record final graduation exam
 */
export const recordFinalExam = async (req, res) => {
    try {
        const { enrollmentId, score, notes } = req.body;
        const teacherId = req.user.id;

        if (score < 0 || score > 100) {
            return res.status(400).json({
                success: false,
                message: "Score must be between 0 and 100"
            });
        }

        // Check if all previous exams passed
        const canTakeFinalExam = await ProgressModel.checkFinalExamEligibility(enrollmentId);

        if (!canTakeFinalExam) {
            return res.status(400).json({
                success: false,
                message: "Student must pass all 5 exams (score ≥90) before taking final exam"
            });
        }

        const passed = score >= 90;

        // Record final exam
        await ProgressModel.recordFinalExam(
            enrollmentId,
            score,
            notes,
            teacherId
        );

        // If passed, mark as graduated
        if (passed) {
            await ProgressModel.markGraduated(enrollmentId);

            // 🔔 FIREBASE NOTIFICATION: Send graduation notification
            // await sendNotification(enrollmentId, {
            //     type: 'graduation',
            //     score: score
            // });
        }

        res.status(200).json({
            success: true,
            message: passed ? "Congratulations! Student graduated!" : "Final exam recorded",
            data: {
                score,
                passed,
                graduated: passed
            }
        });

    } catch (error) {
        console.error("Error recording final exam:", error);
        res.status(500).json({
            success: false,
            message: "Failed to record final exam",
            error: error.message
        });
    }
};

/**
 * Mark attendance for Tajweed/Fiqh courses
 */
export const markAttendance = async (req, res) => {
    try {
        const { enrollmentId, attendanceDate, status, notes } = req.body;
        const teacherId = req.user.id;

        // Validate status
        if (!['present', 'absent', 'excused'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be 'present', 'absent', or 'excused'"
            });
        }

        await ProgressModel.markAttendance(
            enrollmentId,
            attendanceDate,
            status,
            notes,
            teacherId
        );

        // Calculate new completion percentage
        const attendanceStats = await ProgressModel.getAttendanceStats(enrollmentId);

        res.status(200).json({
            success: true,
            message: "Attendance marked successfully",
            data: attendanceStats
        });

    } catch (error) {
        console.error("Error marking attendance:", error);
        res.status(500).json({
            success: false,
            message: "Failed to mark attendance",
            error: error.message
        });
    }
};

/**
 * Get student progress details
 */
export const getStudentProgress = async (req, res) => {
    try {
        const { enrollmentId } = req.params;

        const progress = await ProgressModel.getProgressDetails(enrollmentId);

        if (!progress) {
            return res.status(404).json({
                success: false,
                message: "Progress record not found"
            });
        }

        res.status(200).json({
            success: true,
            data: progress
        });

    } catch (error) {
        console.error("Error fetching progress:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch progress",
            error: error.message
        });
    }
};

/**
 * Get progress milestone history (exams only)
 */
export const getProgressHistory = async (req, res) => {
    try {
        const { enrollmentId } = req.params;

        const history = await ProgressModel.getMilestoneHistory(enrollmentId);

        res.status(200).json({
            success: true,
            data: history
        });

    } catch (error) {
        console.error("Error fetching history:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch history",
            error: error.message
        });
    }
};

