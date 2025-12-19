// ============================================
// FILE: src/controllers/publicBrowsingController.js
// ============================================
import { PublicBrowsingModel } from "../models/PublicBrowsingModel.js";

/**
 * @desc    Get all public mosques
 * @route   GET /api/public/mosques
 * @access  Public
 */
export const getPublicMosques = async (req, res) => {
    try {
        const { governorate, search } = req.query;

        const mosques = await PublicBrowsingModel.getAllPublicMosques({
            governorate,
            search
        });

        res.status(200).json({
            success: true,
            data: mosques,
            count: mosques.length
        });

    } catch (error) {
        console.error("Error fetching public mosques:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch mosques",
            error: error.message
        });
    }
};

/**
 * @desc    Get mosque details with courses
 * @route   GET /api/public/mosques/:id
 * @access  Public
 */
export const getMosqueDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const mosque = await PublicBrowsingModel.getMosqueDetails(id);

        if (!mosque) {
            return res.status(404).json({
                success: false,
                message: "Mosque not found"
            });
        }

        res.status(200).json({
            success: true,
            data: mosque
        });

    } catch (error) {
        console.error("Error fetching mosque details:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch mosque details",
            error: error.message
        });
    }
};

/**
 * @desc    Get all public courses
 * @route   GET /api/public/courses
 * @access  Public
 */
export const getPublicCourses = async (req, res) => {
    try {
        const {
            governorate,
            course_type,
            target_age_group,
            target_gender,
            price_filter,
            schedule_type,
            search
        } = req.query;

        const courses = await PublicBrowsingModel.getAllPublicCourses({
            governorate,
            course_type,
            target_age_group,
            target_gender,
            price_filter,
            schedule_type,
            search
        });

        res.status(200).json({
            success: true,
            data: courses,
            count: courses.length
        });

    } catch (error) {
        console.error("Error fetching public courses:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch courses",
            error: error.message
        });
    }
};

/**
 * @desc    Get course details
 * @route   GET /api/public/courses/:id
 * @access  Public
 */
export const getCourseDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await PublicBrowsingModel.getCourseDetails(id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found or enrollment closed"
            });
        }

        res.status(200).json({
            success: true,
            data: course
        });

    } catch (error) {
        console.error("Error fetching course details:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch course details",
            error: error.message
        });
    }
};

/**
 * @desc    Get filter options
 * @route   GET /api/public/filter-options
 * @access  Public
 */
export const getFilterOptions = async (req, res) => {
    try {
        const options = await PublicBrowsingModel.getFilterOptions();

        res.status(200).json({
            success: true,
            data: options
        });

    } catch (error) {
        console.error("Error fetching filter options:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch filter options",
            error: error.message
        });
    }
};
