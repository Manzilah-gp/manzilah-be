// PURPOSE: Handle teacher profile CRUD operations
// REASON: Separate teacher-specific profile logic from general profile controller

import { TeacherProfileModel } from '../models/teacherProfileModel.js';
import db from '../config/db.js';

/**
 * Get teacher's complete profile data
 * REASON: Provide all teacher information for profile page display
 * @route   GET /api/teacher-profile
 * @access  Private (Teachers only)
 */
export const getTeacherProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // Verify user is a teacher
        const [roleCheck] = await db.query(`
            SELECT r.name 
            FROM ROLE_ASSIGNMENT ra
            JOIN ROLE r ON ra.role_id = r.id
            WHERE ra.user_id = ? AND r.name = 'teacher' AND ra.is_active = true
        `, [userId]);

        if (roleCheck.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Teacher role required.'
            });
        }

        // Get teacher profile data
        const profile = await TeacherProfileModel.getTeacherProfile(userId);

        // Get teacher statistics
        const stats = await TeacherProfileModel.getTeacherStats(userId);

        res.status(200).json({
            success: true,
            data: {
                profile,
                stats
            }
        });

    } catch (error) {
        console.error('Error fetching teacher profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch teacher profile',
            error: error.message
        });
    }
};

/**
 * Update teacher certifications
 * REASON: Allow teachers to update their certification information
 * @route   PUT /api/teacher-profile/certifications
 * @access  Private (Teachers only)
 */
export const updateCertifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const certData = req.body;

        // Validate required fields
        if (typeof certData.has_tajweed_certificate === 'undefined' ||
            typeof certData.has_sharea_certificate === 'undefined') {
            return res.status(400).json({
                success: false,
                message: 'Certification status is required'
            });
        }

        await TeacherProfileModel.updateCertifications(userId, certData);

        res.status(200).json({
            success: true,
            message: 'Certifications updated successfully'
        });

    } catch (error) {
        console.error('Error updating certifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update certifications',
            error: error.message
        });
    }
};

/**
 * Update teacher expertise
 * REASON: Allow teachers to modify their teaching capabilities
 * @route   PUT /api/teacher-profile/expertise
 * @access  Private (Teachers only)
 */
export const updateExpertise = async (req, res) => {
    try {
        const userId = req.user.id;
        const { expertise } = req.body;

        if (!Array.isArray(expertise)) {
            return res.status(400).json({
                success: false,
                message: 'Expertise must be an array'
            });
        }

        // Validate expertise data
        for (const exp of expertise) {
            if (!exp.course_type_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Each expertise entry must have a course_type_id'
                });
            }
        }

        await TeacherProfileModel.updateExpertise(userId, expertise);

        res.status(200).json({
            success: true,
            message: 'Expertise updated successfully'
        });

    } catch (error) {
        console.error('Error updating expertise:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update expertise',
            error: error.message
        });
    }
};

/**
 * Update teacher availability schedule
 * REASON: Allow teachers to manage their available teaching hours
 * @route   PUT /api/teacher-profile/availability
 * @access  Private (Teachers only)
 */
export const updateAvailability = async (req, res) => {
    try {
        const userId = req.user.id;
        const { availability } = req.body;

        if (!Array.isArray(availability)) {
            return res.status(400).json({
                success: false,
                message: 'Availability must be an array'
            });
        }

        // Validate availability data
        const validDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        for (const slot of availability) {
            if (!validDays.includes(slot.day_of_week)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid day of week'
                });
            }
            if (!slot.start_time || !slot.end_time) {
                return res.status(400).json({
                    success: false,
                    message: 'Start time and end time are required'
                });
            }
        }

        await TeacherProfileModel.updateAvailability(userId, availability);

        res.status(200).json({
            success: true,
            message: 'Availability updated successfully'
        });

    } catch (error) {
        console.error('Error updating availability:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update availability',
            error: error.message
        });
    }
};

/**
 * Get course types for selection
 * REASON: Provide dropdown options for teachers to select their expertise
 * @route   GET /api/teacher-profile/course-types
 * @access  Private
 */
export const getCourseTypes = async (req, res) => {
    try {
        const courseTypes = await TeacherProfileModel.getCourseTypes();

        res.status(200).json({
            success: true,
            data: courseTypes
        });

    } catch (error) {
        console.error('Error fetching course types:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch course types',
            error: error.message
        });
    }
};

/**
 * Get memorization levels for selection
 * REASON: Provide dropdown options for teachers to specify qualification level
 * @route   GET /api/teacher-profile/memorization-levels
 * @access  Private
 */
export const getMemorizationLevels = async (req, res) => {
    try {
        const { courseTypeId } = req.query;

        const levels = await TeacherProfileModel.getMemorizationLevels(
            courseTypeId ? parseInt(courseTypeId) : null
        );

        res.status(200).json({
            success: true,
            data: levels
        });

    } catch (error) {
        console.error('Error fetching memorization levels:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch memorization levels',
            error: error.message
        });
    }
};

/**
 * Update complete teacher profile
 * REASON: Allow updating all teacher data in one request for efficiency
 * @route   PUT /api/teacher-profile
 * @access  Private (Teachers only)
 */
export const updateCompleteProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { certifications, expertise, availability } = req.body;

        // Update each section if provided
        if (certifications) {
            await TeacherProfileModel.updateCertifications(userId, certifications);
        }

        if (expertise) {
            await TeacherProfileModel.updateExpertise(userId, expertise);
        }

        if (availability) {
            await TeacherProfileModel.updateAvailability(userId, availability);
        }

        res.status(200).json({
            success: true,
            message: 'Teacher profile updated successfully'
        });

    } catch (error) {
        console.error('Error updating teacher profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update teacher profile',
            error: error.message
        });
    }
};