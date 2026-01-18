
// ============================================
// FILE: src/routes/publicBrowsingRoutes.js
// ============================================
import express from "express";
import {
    getPublicMosques,
    getMosqueDetails,
    getPublicCourses,
    getCourseDetails,
    getFilterOptions,
    getClosestMosques
} from "../controllers/publicBrowsingController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ============================================
// PUBLIC ROUTES - No authentication required
// ============================================

/**
 * Get all public mosques
 * GET /api/public/mosques?governorate=nablus&search=al-aqsa
 */
router.get("/mosques", getPublicMosques);

/**
 * Get closest 3 mosques to user's location
 * GET /api/public/mosques/closest
 * Requires authentication
 */
router.get("/mosques/closest", verifyToken, getClosestMosques);

/**
 * Get mosque details with courses
 * GET /api/public/mosques/:id
 */
router.get("/mosques/:id", getMosqueDetails);

/**
 * Get all public courses
 * GET /api/public/courses?governorate=nablus&course_type=tajweed&price_filter=free
 */
router.get("/courses", getPublicCourses);

/**
 * Get course details
 * GET /api/public/courses/:id
 */
router.get("/courses/:id", getCourseDetails);

/**
 * Get filter options for dropdowns
 * GET /api/public/filter-options
 */
router.get("/filter-options", getFilterOptions);

export default router;
