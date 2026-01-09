// API Route: /api/parent-progress
// Handles parent viewing their children's progress

import { ParentProgressModel } from '../models/parentProgressModel.js';

/**
 * Get all children for the logged-in parent
 * Shows basic info and enrollment summary
 */
export const getMyChildren = async (req, res) => {
    try {
        const parentId = req.user.id;

        const children = await ParentProgressModel.getParentChildren(parentId);

        res.status(200).json({
            success: true,
            data: children,
            count: children.length
        });
    } catch (error) {
        console.error('Error fetching children:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch children',
            error: error.message
        });
    }
};

/**
 * Get detailed progress for a specific child's enrollment
 * Similar to teacher's getStudentProgress but for parent viewing
 */
export const getChildProgress = async (req, res) => {
    try {
        const parentId = req.user.id;
        const { enrollmentId } = req.params;

        // Verify this enrollment belongs to parent's child
        const hasAccess = await ParentProgressModel.verifyParentAccess(parentId, enrollmentId);

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this enrollment'
            });
        }

        // Get progress details (same structure as teacher view)
        const progress = await ParentProgressModel.getChildProgressDetails(enrollmentId);

        if (!progress) {
            return res.status(404).json({
                success: false,
                message: 'Progress record not found'
            });
        }

        res.status(200).json({
            success: true,
            data: progress
        });

    } catch (error) {
        console.error('Error fetching child progress:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch child progress',
            error: error.message
        });
    }
};

/**
 * Get progress history/timeline for a child's enrollment
 * Read-only version of teacher's progress history
 */
export const getChildProgressHistory = async (req, res) => {
    try {
        const parentId = req.user.id;
        const { enrollmentId } = req.params;

        // Verify access
        const hasAccess = await ParentProgressModel.verifyParentAccess(parentId, enrollmentId);

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this enrollment'
            });
        }

        const history = await ParentProgressModel.getChildMilestoneHistory(enrollmentId);

        res.status(200).json({
            success: true,
            data: history
        });

    } catch (error) {
        console.error('Error fetching child history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch child history',
            error: error.message
        });
    }
};

/**
 * Get all enrollments across all children
 * Shows courses each child is enrolled in
 */
export const getAllChildrenEnrollments = async (req, res) => {
    try {
        const parentId = req.user.id;

        const enrollments = await ParentProgressModel.getAllChildrenEnrollments(parentId);

        res.status(200).json({
            success: true,
            data: enrollments,
            count: enrollments.length
        });

    } catch (error) {
        console.error('Error fetching enrollments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch enrollments',
            error: error.message
        });
    }
};

/**
 * Get progress summary for all children
 * Overview dashboard for parent
 */
export const getChildrenProgressSummary = async (req, res) => {
    try {
        const parentId = req.user.id;

        const summary = await ParentProgressModel.getChildrenProgressSummary(parentId);

        res.status(200).json({
            success: true,
            data: summary
        });

    } catch (error) {
        console.error('Error fetching progress summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch progress summary',
            error: error.message
        });
    }
};

/**
 * Get a specific child's overview with all their courses
 */
export const getChildOverview = async (req, res) => {
    try {
        const parentId = req.user.id;
        const { childId } = req.params;

        // Verify this is parent's child
        const isParentChild = await ParentProgressModel.verifyParentChild(parentId, childId);

        if (!isParentChild) {
            return res.status(403).json({
                success: false,
                message: 'This child does not belong to your account'
            });
        }

        const overview = await ParentProgressModel.getChildOverview(childId);

        res.status(200).json({
            success: true,
            data: overview
        });

    } catch (error) {
        console.error('Error fetching child overview:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch child overview',
            error: error.message
        });
    }
};