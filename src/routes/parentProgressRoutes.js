

import express from 'express';
import {
    getMyChildren,
    getChildProgress,
    getChildProgressHistory,
    getAllChildrenEnrollments,
    getChildrenProgressSummary,
    getChildOverview
} from '../controllers/parentProgressController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/parent-progress/children
 * @desc    Get all verified children for logged-in parent
 * @access  Private (Parent role)
 */
router.get('/children', getMyChildren);

/**
 * @route   GET /api/parent-progress/progress/:enrollmentId
 * @desc    Get detailed progress for a specific child's enrollment
 * @access  Private (Parent role)
 */
router.get('/progress/:enrollmentId', getChildProgress);

/**
 * @route   GET /api/parent-progress/history/:enrollmentId
 * @desc    Get progress history/timeline for a child's enrollment
 * @access  Private (Parent role)
 */
router.get('/history/:enrollmentId', getChildProgressHistory);

/**
 * @route   GET /api/parent-progress/enrollments
 * @desc    Get all enrollments across all children
 * @access  Private (Parent role)
 */
router.get('/enrollments', getAllChildrenEnrollments);

/**
 * @route   GET /api/parent-progress/summary
 * @desc    Get progress summary dashboard for all children
 * @access  Private (Parent role)
 */
router.get('/summary', getChildrenProgressSummary);

/**
 * @route   GET /api/parent-progress/children/:childId
 * @desc    Get complete overview for a specific child
 * @access  Private (Parent role)
 */
router.get('/children/:childId', getChildOverview);

export default router;