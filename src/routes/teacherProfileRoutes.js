// PURPOSE: Define teacher profile API endpoints
// REASON: Organize teacher-specific routes separately from general profile routes

import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
    getTeacherProfile,
    updateCertifications,
    updateExpertise,
    updateAvailability,
    getCourseTypes,
    getMemorizationLevels,
    updateCompleteProfile
} from '../controllers/teacherProfileController.js';

const router = express.Router();

// All routes require authentication
// REASON: Only logged-in teachers can access/modify their profile

/**
 * @route   GET /api/teacher-profile
 * @desc    Get complete teacher profile with stats
 * @access  Private (Teachers only)
 */
router.get('/', verifyToken, getTeacherProfile);

/**
 * @route   PUT /api/teacher-profile
 * @desc    Update complete teacher profile (all sections)
 * @access  Private (Teachers only)
 */
router.put('/', verifyToken, updateCompleteProfile);

/**
 * @route   PUT /api/teacher-profile/certifications
 * @desc    Update teacher certifications only
 * @access  Private (Teachers only)
 */
router.put('/certifications', verifyToken, updateCertifications);

/**
 * @route   PUT /api/teacher-profile/expertise
 * @desc    Update teacher expertise only
 * @access  Private (Teachers only)
 */
router.put('/expertise', verifyToken, updateExpertise);

/**
 * @route   PUT /api/teacher-profile/availability
 * @desc    Update teacher availability schedule only
 * @access  Private (Teachers only)
 */
router.put('/availability', verifyToken, updateAvailability);

/**
 * @route   GET /api/teacher-profile/course-types
 * @desc    Get all course types for selection
 * @access  Private
 */
router.get('/course-types', verifyToken, getCourseTypes);

/**
 * @route   GET /api/teacher-profile/memorization-levels
 * @desc    Get memorization levels for selection
 * @access  Private
 */
router.get('/memorization-levels', verifyToken, getMemorizationLevels);

export default router;