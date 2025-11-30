// backend/routes/statisticsRoutes.js
import express from "express";
import {
    getMinistryStatistics,
    getMosqueStatistics,
    getGovernorateStats,
    getMosqueEnrollmentTrends,
    getDashboardData
} from "../controllers/statisticsController.js";
import { verifyToken, checkRole } from "../middlewares/authMiddleware.js";
import { StatisticsModel } from "../models/statisticsModel.js";

const router = express.Router();

/**
 * Dashboard Routes
 * All routes require authentication
 */

// Smart endpoint - returns data based on user role
router.get("/data", verifyToken, getDashboardData);

// Ministry Admin - System-wide statistics
router.get(
    "/ministry-statistics",
    verifyToken,
    checkRole(["ministry_admin"]),
    getMinistryStatistics
);

// Ministry Admin - Governorate distribution for charts
router.get(
    "/governorate-stats",
    verifyToken,
    checkRole(["ministry_admin"]),
    getGovernorateStats
);

// Mosque Admin - Mosque-specific statistics
router.get(
    "/mosque-statistics",
    verifyToken,
    checkRole(["mosque_admin"]),
    getMosqueStatistics
);

// Mosque Admin - Enrollment trends for charts
router.get(
    "/mosque-enrollment-trends",
    verifyToken,
    checkRole(["mosque_admin"]),
    getMosqueEnrollmentTrends
);

// Add this temporary route for testing
router.get("/test-db", async (req, res) => {
    try {
        const dbState = await StatisticsModel.checkDatabaseState();
        res.json({
            success: true,
            message: "Database state check",
            data: dbState
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Database check failed",
            error: error.message
        });
    }
});

export default router;