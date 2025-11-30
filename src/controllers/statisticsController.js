// backend/controllers/statisticsController.js
import { StatisticsModel } from "../models/statisticsModel.js";

/**
 * Get Ministry Admin Statistics
 * Returns system-wide statistics for ministry admin
 */
export const getMinistryStatistics = async (req, res) => {
    console.log(" /ministry-statistics route hit");
    try {
        // Verify user is ministry admin
        if (!req.user.roles?.includes('ministry_admin')) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Ministry admin role required."
            });
        }

        // Fetch all statistics in parallel for better performance
        const [
            totalMosques,
            totalStudents,
            totalTeachers,
            totalCourses,
            activeEnrollments,
            recentMosques
        ] = await Promise.all([
            StatisticsModel.getTotalMosques(),
            StatisticsModel.getTotalStudentsByRole(),
            StatisticsModel.getTotalTeachersByRole(),
            StatisticsModel.getTotalCourses(),
            StatisticsModel.getActiveEnrollments(),
            StatisticsModel.getRecentMosques(5)
        ]);

        res.json({
            success: true,
            data: {
                totalMosques: totalMosques || 0,
                totalStudents: totalStudents || 0,
                totalTeachers: totalTeachers || 0,
                totalCourses: totalCourses || 0,
                activeEnrollments: activeEnrollments || 0,
                recentMosques: recentMosques || [],
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error("Error fetching ministry statistics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch ministry statistics",
            error: error.message
        });
    }
};




/**
 * Get Mosque Admin Statistics
 * Returns statistics specific to the mosque admin's mosque
 */
export const getMosqueStatistics = async (req, res) => {
    console.log("/mosque-statistics route hit");

    try {
        const userId = req.user.id;

        // Get the mosque this admin manages
        const mosqueId = await StatisticsModel.getMosqueIdForAdmin(userId);

        if (!mosqueId) {
            return res.status(404).json({
                success: false,
                message: "No mosque assigned to this admin"
            });
        }

        // Fetch mosque-specific statistics
        const [
            mosqueDetails,
            studentCount,
            teacherCount,
            courseCount,
            activeEnrollments,
            recentEnrollments,
            courseList
        ] = await Promise.all([
            StatisticsModel.getMosqueDetails(mosqueId),
            StatisticsModel.getStudentCountByMosque(mosqueId),
            StatisticsModel.getTeacherCountByMosque(mosqueId),
            StatisticsModel.getCourseCountByMosque(mosqueId),
            StatisticsModel.getActiveEnrollmentsByMosque(mosqueId),
            StatisticsModel.getRecentEnrollmentsByMosque(mosqueId, 10),
            StatisticsModel.getCoursesByMosque(mosqueId)
        ]);

        res.json({
            success: true,
            data: {
                mosqueId,
                mosqueDetails,
                studentCount,
                teacherCount,
                courseCount,
                activeEnrollments,
                recentEnrollments,
                courseList,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error("Error fetching mosque statistics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch mosque statistics",
            error: error.message
        });
    }
};

/**
 * Get Governorate-wise Mosque Distribution
 * For charts showing mosque count by governorate
 */
export const getGovernorateStats = async (req, res) => {
    console.log(" governorate-stats route hit");

    try {
        // Only ministry admin can see system-wide governorate stats
        if (!req.user.roles?.includes('ministry_admin')) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Ministry admin role required."
            });
        }

        const governorateData = await StatisticsModel.getMosqueCountByGovernorate();

        // Transform data for frontend chart
        const chartData = governorateData.map(item => ({
            label: item.governorate.charAt(0).toUpperCase() + item.governorate.slice(1),
            value: item.mosqueCount,
            governorate: item.governorate,
            percentage: 0 // Will be calculated on frontend or here
        }));

        // Calculate percentages
        const total = chartData.reduce((sum, item) => sum + item.value, 0);
        chartData.forEach(item => {
            item.percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
        });

        res.json({
            success: true,
            data: chartData,
            total,
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error("Error fetching governorate stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch governorate statistics",
            error: error.message
        });
    }
};

/**
 * Get Course Enrollment Trends for Mosque Admin
 * Shows enrollment trends over time for their mosque
 */
export const getMosqueEnrollmentTrends = async (req, res) => {
    console.log("/mosque-enrollment-trends route hit");
    try {
        const userId = req.user.id;

        // Get the mosque this admin manages
        const mosqueId = await StatisticsModel.getMosqueIdForAdmin(userId);

        if (!mosqueId) {
            return res.status(404).json({
                success: false,
                message: "No mosque assigned to this admin"
            });
        }

        // Get enrollment trends by course for the last 6 months
        const enrollmentTrends = await StatisticsModel.getEnrollmentTrendsByMosque(mosqueId);

        // Transform for chart
        const chartData = enrollmentTrends.map(item => ({
            label: item.courseName,
            value: item.enrollmentCount,
            courseId: item.courseId,
            courseType: item.courseType
        }));

        res.json({
            success: true,
            data: chartData,
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error("Error fetching enrollment trends:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch enrollment trends",
            error: error.message
        });
    }
};

/**
 * Get Dashboard Data Based on Role
 * Smart endpoint that returns appropriate data based on user role
 */
export const getDashboardData = async (req, res) => {
    try {

        const userRoles = req.user.roles || [];

        if (userRoles.includes('ministry_admin')) {
            return await getMinistryStatistics(req, res);
        } else if (userRoles.includes('mosque_admin')) {
            return await getMosqueStatistics(req, res);
        } else if (userRoles.includes('teacher')) {
            // Return teacher-specific statistics
            return res.json({
                success: true,
                message: "Teacher dashboard - to be implemented",
                data: {}
            });
        } else if (userRoles.includes('student')) {
            // Return student-specific statistics
            return res.json({
                success: true,
                message: "Student dashboard - to be implemented",
                data: {}
            });
        } else {
            return res.status(403).json({
                success: false,
                message: "Invalid role for dashboard access"
            });
        }

    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard data",
            error: error.message
        });
    }
};