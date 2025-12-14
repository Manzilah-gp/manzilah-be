import { TeacherManagementModel } from "../models/teacherManagementModel.js";
import { MosqueModel } from "../models/MosqueModel.js";

/**
 * @desc    Get list of teachers for the admin's mosque
 * @route   GET /api/teachers
 * @access  Private (Mosque Admin)
 */
export const getTeachers = async (req, res) => {
    try {
        const adminId = req.user.id;
        const mosqueId = await MosqueModel.findByAdminId(adminId);

        if (!mosqueId) {
            return res.status(403).json({ message: "No mosque assigned to this admin" });
        }

        const teachers = await TeacherManagementModel.getTeachersByMosque(mosqueId);
        res.status(200).json(teachers);
    } catch (error) {
        console.error("Error fetching teachers:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/**
 * @desc    Get full details of a teacher including expertise and availability
 * @route   GET /api/teachers/:teacherId
 * @access  Private (Mosque Admin)
 */
export const getTeacherDetails = async (req, res) => {
    console.log('get teacher details hit ');
    try {
        const { teacherId } = req.params;
        const adminId = req.user.id;
        const mosqueId = await MosqueModel.findByAdminId(adminId);

        if (!mosqueId) {
            return res.status(403).json({ message: "No mosque assigned to this admin" });
        }

        const teacher = await TeacherManagementModel.getTeacherDetails(teacherId, mosqueId);

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found or not assigned to this mosque" });
        }

        res.status(200).json(teacher);
    } catch (error) {
        console.error("Error fetching teacher details:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/**
 * @desc    Update teacher active status
 * @route   PATCH /api/teachers/:teacherId/status
 * @access  Private (Mosque Admin)
 */
export const toggleTeacherStatus = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { isActive } = req.body;
        const adminId = req.user.id;
        const mosqueId = await MosqueModel.findByAdminId(adminId);

        if (!mosqueId) {
            return res.status(403).json({ message: "No mosque assigned to this admin" });
        }

        if (isActive === undefined) {
            return res.status(400).json({ message: "isActive field is required" });
        }

        const success = await TeacherManagementModel.updateTeacherStatus(teacherId, mosqueId, isActive);

        if (success) {
            res.status(200).json({ message: "Teacher status updated successfully" });
        } else {
            res.status(404).json({ message: "Teacher not found or update failed" });
        }
    } catch (error) {
        console.error("Error updating teacher status:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/**
 * @desc    Remove teacher from mosque (delete role assignment)
 * @route   DELETE /api/teachers/:teacherId
 * @access  Private (Mosque Admin)
 */
export const deleteTeacher = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const adminId = req.user.id;
        const mosqueId = await MosqueModel.findByAdminId(adminId);

        if (!mosqueId) {
            return res.status(403).json({ message: "No mosque assigned to this admin" });
        }

        const success = await TeacherManagementModel.removeTeacherFromMosque(teacherId, mosqueId);

        if (success) {
            res.status(200).json({ message: "Teacher removed from mosque successfully" });
        } else {
            res.status(404).json({ message: "Teacher not found or already removed" });
        }
    } catch (error) {
        console.error("Error removing teacher:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/**
 * @desc    Get courses assigned to a teacher
 * @route   GET /api/teachers/:teacherId/courses
 * @access  Private (Mosque Admin)
 */
export const getTeacherCourses = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const adminId = req.user.id;
        const mosqueId = await MosqueModel.findByAdminId(adminId);

        if (!mosqueId) {
            return res.status(403).json({ message: "No mosque assigned to this admin" });
        }

        const courses = await TeacherManagementModel.getTeacherCourses(teacherId, mosqueId);
        res.status(200).json(courses);
    } catch (error) {
        console.error("Error fetching teacher courses:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
