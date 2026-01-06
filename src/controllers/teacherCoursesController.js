// src/controllers/teacherCoursesController.js
import { TeacherCoursesModel } from "../models/teacherCoursesModel.js";

/**
 * Get all courses taught by the logged-in teacher
 */
export const getMyCourses = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const courses = await TeacherCoursesModel.getTeacherCourses(teacherId);

        res.status(200).json({
            success: true,
            data: courses,
            count: courses.length
        });
    } catch (error) {
        console.error('Error fetching teacher courses:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch courses',
            error: error.message
        });
    }
};

/**
 * Get all students enrolled in a specific course
 */
export const getCourseStudents = async (req, res) => {
    try {
        const { courseId } = req.params;
        const teacherId = req.user.id;

        const students = await TeacherCoursesModel.getCourseStudents(courseId, teacherId);

        res.status(200).json({
            success: true,
            data: students,
            count: students.length
        });
    } catch (error) {
        console.error('Error fetching course students:', error);
        res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
            success: false,
            message: error.message || 'Failed to fetch students'
        });
    }
};

/**
 * Get all students across all teacher's courses
 */
export const getAllMyStudents = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { courseId, search, minProgress, maxProgress } = req.query;

        const students = await TeacherCoursesModel.getAllTeacherStudents(teacherId, {
            courseId,
            search,
            minProgress: minProgress ? parseInt(minProgress) : undefined,
            maxProgress: maxProgress ? parseInt(maxProgress) : undefined
        });

        res.status(200).json({
            success: true,
            data: students,
            count: students.length
        });
    } catch (error) {
        console.error('Error fetching all students:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch students',
            error: error.message
        });
    }
};

/**
 * Get students for a specific session (by date)
 */
export const getSessionStudents = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { date } = req.query;
        const teacherId = req.user.id;

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Session date is required'
            });
        }

        const students = await TeacherCoursesModel.getStudentsForSession(
            courseId,
            date,
            teacherId
        );

        res.status(200).json({
            success: true,
            data: students,
            count: students.length,
            sessionDate: date
        });
    } catch (error) {
        console.error('Error fetching session students:', error);
        res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
            success: false,
            message: error.message || 'Failed to fetch session students'
        });
    }
};

/**
 * Bulk mark attendance for multiple students
 */
export const bulkMarkAttendance = async (req, res) => {
    try {
        const { attendanceRecords } = req.body;
        const teacherId = req.user.id;

        if (!attendanceRecords || !Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Attendance records array is required'
            });
        }

        const result = await TeacherCoursesModel.bulkMarkAttendance(attendanceRecords, teacherId);

        res.status(200).json({
            success: true,
            message: `Attendance marked for ${result.recordsUpdated} students`,
            data: result
        });
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark attendance',
            error: error.message
        });
    }
};