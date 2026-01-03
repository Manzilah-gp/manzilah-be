import { ZegoCloudService } from '../services/zegoCloudService.js';
import { CourseModel } from '../models/CourseModel.js';
import { StatisticsModel } from '../models/statisticsModel.js';
import db from '../config/db.js';

/**
 * @desc    Enable online meetings for a course
 * @route   POST /api/video-calls/enable/:courseId
 * @access  Private (Mosque Admin only)
 */
export const enableCourseMeeting = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Check if user is mosque admin for this course
        const course = await CourseModel.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Verify admin owns this mosque
        const mosqueId = await StatisticsModel.getMosqueIdForAdmin(userId);
        if (!mosqueId || mosqueId !== course.mosque_id) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        // Generate permanent meeting URL
        const meetingUrl = ZegoCloudService.generateMeetingUrl(courseId);

        // Update course with meeting URL
        await CourseModel.update(courseId, {
            is_online_enabled: true,
            online_meeting_url: meetingUrl
        });

        res.status(200).json({
            success: true,
            message: 'Online meetings enabled for course',
            data: {
                meetingUrl,
                roomId: ZegoCloudService.generateRoomId(courseId)
            }
        });

    } catch (error) {
        console.error('Error enabling course meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to enable meetings',
            error: error.message
        });
    }
};

/**
 * @desc    Disable online meetings for a course
 * @route   POST /api/video-calls/disable/:courseId
 * @access  Private (Mosque Admin only)
 */
export const disableCourseMeeting = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        const course = await CourseModel.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        const mosqueId = await StatisticsModel.getMosqueIdForAdmin(userId);
        if (!mosqueId || mosqueId !== course.mosque_id) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        await CourseModel.update(courseId, {
            is_online_enabled: false,
            online_meeting_url: null
        });

        res.status(200).json({
            success: true,
            message: 'Online meetings disabled for course'
        });

    } catch (error) {
        console.error('Error disabling course meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to disable meetings',
            error: error.message
        });
    }
};

/**
 * @desc    Get meeting access token for a user
 * @route   GET /api/video-calls/token/:courseId
 * @access  Private (Enrolled students, assigned teacher, mosque admin)
 */
export const getMeetingToken = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Get course details
        const course = await CourseModel.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        if (!course.is_online_enabled) {
            return res.status(400).json({
                success: false,
                message: 'Online meetings not enabled for this course'
            });
        }

        // Check user authorization
        const hasAccess = await checkUserAccessToCourse(userId, courseId, course);
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this meeting'
            });
        }

        // Get user name
        const [users] = await db.execute(
            'SELECT full_name FROM USER WHERE id = ?',
            [userId]
        );
        const userName = users[0]?.full_name || 'User';

        // Generate token
        const roomId = ZegoCloudService.generateRoomId(courseId);
        const tokenData = ZegoCloudService.generateToken(
            userId,
            userName,
            roomId,
            86400 // 24 hours
        );

        res.status(200).json({
            success: true,
            data: {
                ...tokenData,
                meetingUrl: course.online_meeting_url,
                courseName: course.name
            }
        });

    } catch (error) {
        console.error('Error generating meeting token:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate meeting token',
            error: error.message
        });
    }
};

/**
 * Helper: Check if user has access to course meeting
 * Access: Enrolled students, assigned teacher, mosque admin
 */
async function checkUserAccessToCourse(userId, courseId, course) {
    // Check if user is the assigned teacher
    if (course.teacher_id === userId) {
        console.log('meeting : User is the assigned teacher');
        return true;
    }

    // Check if user is enrolled as student
    const [enrollments] = await db.execute(
        'SELECT id FROM ENROLLMENT WHERE student_id = ? AND course_id = ? AND status = ?',
        [userId, courseId, 'active']
    );
    if (enrollments.length > 0) {
        console.log('meeting : User is enrolled as student');
        return true;
    }

    // Check if user is mosque admin for this course's mosque
    const mosqueId = await StatisticsModel.getMosqueIdForAdmin(userId);
    if (mosqueId && mosqueId === course.mosque_id) {
        console.log('meeting : User is mosque admin');
        return true;
    }

    return false;
}

/**
 * @desc    Get meeting details for a course
 * @route   GET /api/video-calls/meeting/:courseId
 * @access  Private (Enrolled students, assigned teacher, mosque admin)
 */
export const getMeetingDetails = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        const course = await CourseModel.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        const hasAccess = await checkUserAccessToCourse(userId, courseId, course);
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                isOnlineEnabled: course.is_online_enabled,
                meetingUrl: course.online_meeting_url,
                roomId: ZegoCloudService.generateRoomId(courseId),
                courseName: course.name
            }
        });

    } catch (error) {
        console.error('Error fetching meeting details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch meeting details',
            error: error.message
        });
    }
};