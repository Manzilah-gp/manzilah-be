import { StudentDashboardModel } from "../models/studentDashboardModel.js";

/**
 * @desc    Get all enrollments for logged-in student
 * @route   GET /api/student/my-enrollments
 * @access  Private (Student only)
 */
export const getMyEnrollments = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRoles = req.user.roles || []; // Ensure roles is an array
        const { status, search, studentId } = req.query;

        let targetStudentIds = [];

        if (userRoles.includes('parent')) {
            // Get all children objects
            const children = await StudentDashboardModel.findChildren(userId);
            // Extract IDs
            const childrenIds = children.map(child => child.id);

            // Default to showing all children's courses if no specific child selected
            targetStudentIds = childrenIds;

            // If parent selected specific child
            if (studentId) {
                // Security check: ensure the child belongs to this parent
                if (childrenIds.map(String).includes(String(studentId))) {
                    targetStudentIds = [studentId];
                } else {
                    return res.status(403).json({
                        success: false,
                        message: "Unauthorized access to this student's enrollments"
                    });
                }
            }
        } else {
            // Regular student view
            targetStudentIds = [userId];
        }

        // If no students/children (e.g. parent with no verified kids), return empty early
        if (targetStudentIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                count: 0
            });
        }

        const enrollments = await StudentDashboardModel.findAllEnrollments(targetStudentIds, status, search);

        res.status(200).json({
            success: true,
            data: enrollments,
            count: enrollments.length
        });

    } catch (error) {
        console.error("Error fetching student enrollments:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch enrollments",
            error: error.message
        });
    }
};

/**
 * @desc    Get single enrollment details
 * @route   GET /api/student/enrollments/:enrollmentId
 * @access  Private (Student only)
 */
export const getEnrollmentDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRoles = req.user.roles || [];
        const { enrollmentId } = req.params;

        let allowedStudentIds = [userId];

        if (userRoles.includes('parent')) {
            const children = await StudentDashboardModel.findChildren(userId);
            const childrenIds = children.map(c => c.id);
            allowedStudentIds = [...allowedStudentIds, ...childrenIds];
        }

        const enrollment = await StudentDashboardModel.findEnrollmentById(enrollmentId, allowedStudentIds);

        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: "Enrollment not found"
            });
        }

        // Get course schedule
        const schedules = await StudentDashboardModel.findCourseSchedule(enrollment.course_id);
        enrollment.schedule = schedules;

        res.status(200).json({
            success: true,
            data: enrollment
        });

    } catch (error) {
        console.error("Error fetching enrollment details:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch enrollment details",
            error: error.message
        });
    }
};

/**
 * @desc    Get student dashboard statistics
 * @route   GET /api/student/stats
 * @access  Private (Student and Parent)
 */
export const getStudentStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRoles = req.user.roles || [];
        const { studentId } = req.query;

        let targetIds = [userId];

        if (userRoles.includes('parent')) {
            if (studentId) {
                // Verify child
                const children = await StudentDashboardModel.findChildren(userId);
                const childrenIds = children.map(c => c.id);

                if (childrenIds.map(String).includes(String(studentId))) {
                    targetIds = [studentId];
                } else {
                    return res.status(403).json({ success: false, message: 'Unauthorized' });
                }
            } else {
                // If "All" selected (no studentId), use ALL children IDs
                const children = await StudentDashboardModel.findChildren(userId);
                if (children.length > 0) {
                    targetIds = children.map(c => c.id);
                } else {
                    targetIds = [];
                }
            }
        }

        const stats = await StudentDashboardModel.findStudentStats(targetIds);

        res.status(200).json({
            success: true,
            data: {
                totalEnrollments: stats?.total_enrollments || 0,
                activeCourses: stats?.active_courses || 0,
                completedCourses: stats?.completed_courses || 0,
                droppedCourses: stats?.dropped_courses || 0,
                mosquesCount: stats?.mosques_count || 0,
                avgProgress: Math.round(stats?.avg_progress || 0)
            }
        });

    } catch (error) {
        console.error("Error fetching student stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch statistics",
            error: error.message
        });
    }
};

/**
 * @desc    Withdraw from a course (instant)
 * @route   POST /api/student/enrollments/:enrollmentId/withdraw
 * @access  Private (Student only)
 */
export const withdrawFromCourse = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRoles = req.user.roles || [];
        const { enrollmentId } = req.params;

        let allowedStudentIds = [userId];

        if (userRoles.includes('parent')) {
            const children = await StudentDashboardModel.findChildren(userId);
            const childrenIds = children.map(c => c.id);
            allowedStudentIds = [...allowedStudentIds, ...childrenIds];
        }

        // Check if enrollment exists and belongs to student (or child)
        const enrollment = await StudentDashboardModel.findBasicEnrollmentInfo(enrollmentId, allowedStudentIds);

        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: "Enrollment not found"
            });
        }

        // Check if already withdrawn or completed
        if (enrollment.status === 'dropped') {
            return res.status(400).json({
                success: false,
                message: "Already withdrawn from this course"
            });
        }

        if (enrollment.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: "Cannot withdraw from completed course"
            });
        }

        // Update enrollment status to 'dropped'
        await StudentDashboardModel.withdrawEnrollment(enrollmentId);

        res.status(200).json({
            success: true,
            message: "Successfully withdrawn from course"
        });

    } catch (error) {
        console.error("Error withdrawing from course:", error);
        res.status(500).json({
            success: false,
            message: "Failed to withdraw from course",
            error: error.message
        });
    }
};

/**
 * @desc    Get courses by mosque (for filtering)
 * @route   GET /api/student/mosques/:mosqueId/courses
 * @access  Private (Student only)
 */
export const getCoursesByMosque = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { mosqueId } = req.params;

        const courses = await StudentDashboardModel.findCoursesByMosque(studentId, mosqueId);

        res.status(200).json({
            success: true,
            data: courses,
            count: courses.length
        });

    } catch (error) {
        console.error("Error fetching mosque courses:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch courses",
            error: error.message
        });
    }
};

/**
 * @desc    Get connected children for parent
 * @route   GET /api/student/children
 * @access  Private
 */
export const getChildren = async (req, res) => {
    try {
        const userId = req.user.id;
        const children = await StudentDashboardModel.findChildren(userId);

        res.status(200).json({
            success: true,
            data: children
        });
    } catch (error) {
        console.error("Error fetching children:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch children",
            error: error.message
        });
    }
};