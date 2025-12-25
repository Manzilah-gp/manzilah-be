
import db from "../config/db.js";
import { calendarModel } from "../models/calendarModel.js";
/**
 * Get user's schedule based on their role
 */
export const getMySchedule = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRoles = req.user.roles || [];

        let scheduleData = {};

        // MOSQUE ADMIN - Get courses + events
        if (userRoles.includes('mosque_admin')) {
            scheduleData = await calendarModel.getMosqueAdminSchedule(userId);
        }
        // TEACHER - Get courses they're teaching
        else if (userRoles.includes('teacher')) {
            scheduleData = await calendarModel.getTeacherSchedule(userId);
        }
        // STUDENT - Get enrolled courses
        else if (userRoles.includes('student')) {
            scheduleData = await calendarModel.getStudentSchedule(userId);
        }
        // PARENT - Get children's courses
        else if (userRoles.includes('parent')) {
            scheduleData = await calendarModel.getParentSchedule(userId);
        }

        res.json({
            success: true,
            data: scheduleData
        });

    } catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch schedule',
            error: error.message
        });
    }
};


