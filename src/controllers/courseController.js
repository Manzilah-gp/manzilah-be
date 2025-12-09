import { CourseModel } from "../models/CourseModel.js";
import { TeacherSuggestionModel } from "../models/TeacherSuggestionModel.js";
import { StatisticsModel } from "../models/statisticsModel.js"
/**
 * @desc    Get all course types
 * @route   GET /api/courses/types
 * @access  Private
 */
export const getCourseTypes = async (req, res) => {
    try {
        const courseTypes = await CourseModel.getCourseTypes();
        res.status(200).json(courseTypes);
    } catch (error) {
        console.error("Error fetching course types:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/**
 * @desc    Get all memorization levels
 * @route   GET /api/courses/memorization-levels
 * @access  Private
 */
export const getMemorizationLevels = async (req, res) => {
    try {
        const levels = await CourseModel.getMemorizationLevels();
        res.status(200).json(levels);
    } catch (error) {
        console.error("Error fetching memorization levels:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/**
 * @desc    Create a new course
 * @route   POST /api/courses
 * @access  Private (Mosque Admin only)
 */
export const createCourse = async (req, res) => {
    try {
        const { user } = req;
        const courseData = req.body;

        // Get mosque_id for this admin (1-1 relationship)
        const mosqueId = await StatisticsModel.getMosqueIdForAdmin(user.id);

        if (!mosqueId) {
            return res.status(403).json({
                message: "User is not a mosque admin or mosque not found"
            });
        }


        // Validate required fields
        if (!courseData.mosque_id || !courseData.course_type_id || !courseData.name) {
            return res.status(400).json({ message: "Missing required fields: mosque_id, course_type_id, name" });
        }

        // Check if user has permission for this mosque
        // (You may need to add this validation based on user roles)

        // Include target_gender in course data (can be null for mixed gender)
        const fullCourseData = {
            ...courseData,
            mosque_id: mosqueId, // Use admin's mosque, not from request
            target_gender: courseData.target_gender || null
        };

        const courseId = await CourseModel.create(fullCourseData, user.id);

        res.status(201).json({
            message: "Course created successfully",
            courseId,
            course: {
                id: courseId,
                ...fullCourseData
            }
        });
    } catch (error) {
        console.error("Error creating course:", error);
        res.status(500).json({ message: "Failed to create course", error: error.message });
    }
};

/**
 * @desc    Get all courses for a specific mosque
 * @route   GET /api/courses/mosque/:mosqueId
 * @access  Private
 */
export const getCoursesByMosque = async (req, res) => {
    try {
        const { mosqueId } = req.params;

        if (!mosqueId) {
            return res.status(400).json({ message: "Mosque ID is required" });
        }

        const courses = await CourseModel.findByMosque(mosqueId);
        res.status(200).json(courses);
    } catch (error) {
        console.error("Error fetching mosque courses:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/**
 * @desc    Get course by ID
 * @route   GET /api/courses/:id
 * @access  Private
 */
export const getCourseById = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await CourseModel.findById(id);

        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        res.status(200).json(course);
    } catch (error) {
        console.error("Error fetching course:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/**
 * @desc    Update a course
 * @route   PUT /api/courses/:id
 * @access  Private (Mosque Admin only)
 */
export const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Check if course exists
        const courseExists = await CourseModel.exists(id);
        if (!courseExists) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Include target_gender in update data if provided
        if (updateData.target_gender !== undefined) {
            updateData.target_gender = updateData.target_gender || null;
        }

        const updated = await CourseModel.update(id, updateData);

        if (updated) {
            const updatedCourse = await CourseModel.findById(id);
            res.status(200).json({
                message: "Course updated successfully",
                course: updatedCourse
            });
        } else {
            res.status(400).json({ message: "Failed to update course" });
        }
    } catch (error) {
        console.error("Error updating course:", error);
        res.status(500).json({ message: "Failed to update course", error: error.message });
    }
};

/**
 * @desc    Delete a course (soft delete)
 * @route   DELETE /api/courses/:id
 * @access  Private (Mosque Admin only)
 */
export const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if course exists
        const courseExists = await CourseModel.exists(id);
        if (!courseExists) {
            return res.status(404).json({ message: "Course not found" });
        }

        const deleted = await CourseModel.hardDelete(id);

        if (deleted) {
            res.status(200).json({ message: "Course deleted successfully" });
        } else {
            res.status(400).json({ message: "Failed to delete course" });
        }
    } catch (error) {
        console.error("Error deleting course:", error);
        res.status(500).json({ message: "Failed to delete course", error: error.message });
    }
};

/**
 * @desc    Get suggested teachers for a course
 * @route   POST /api/courses/suggest-teachers
 * @access  Private (Mosque Admin only)
 */
export const getSuggestedTeachers = async (req, res) => {
    try {
        const courseRequirements = req.body;

        // Validate required fields
        if (!courseRequirements.mosque_id || !courseRequirements.course_type_id) {
            return res.status(400).json({
                message: "Missing required fields: mosque_id and course_type_id are required"
            });
        }

        // Use the TeacherSuggestionModel to get suggested teachers
        const suggestedTeachers = await TeacherSuggestionModel.getSuggestedTeachers(courseRequirements);

        // Format the response to match frontend expectations (like in teacher_selection_modal.jsx)
        const formattedTeachers = suggestedTeachers.map(teacher => ({
            ...teacher,
            match_score: teacher.match_score || 0,
            recommendation_level: teacher.recommendation_level || 'suitable',
            match_details: teacher.match_details || {}
        }));

        res.status(200).json(formattedTeachers);
    } catch (error) {
        console.error("Error suggesting teachers:", error);
        res.status(500).json({ message: "Failed to suggest teachers", error: error.message });
    }
};

/**
 * @desc    Assign teacher to a course
 * @route   POST /api/courses/assign-teacher
 * @access  Private (Mosque Admin only)
 */
export const assignTeacherToCourse = async (req, res) => {
    try {
        const { courseId, teacherId } = req.body;
        const { user } = req; // The admin assigning the teacher

        if (!courseId || !teacherId) {
            return res.status(400).json({ message: "courseId and teacherId are required" });
        }

        // Check if course exists
        const courseExists = await CourseModel.exists(courseId);
        if (!courseExists) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Assign teacher (this would typically involve creating an enrollment or assignment record)
        // For now, we'll use the CourseModel's assignTeacher method
        const assigned = await CourseModel.assignTeacher(courseId, teacherId, user.id);

        if (assigned) {
            res.status(200).json({
                message: "Teacher assigned successfully",
                courseId,
                teacherId
            });
        } else {
            res.status(400).json({ message: "Failed to assign teacher" });
        }
    } catch (error) {
        console.error("Error assigning teacher:", error);
        res.status(500).json({ message: "Failed to assign teacher", error: error.message });
    }

};

export const getMosqueIdForAdmin = async (req, res) => {

    try {
        const adminId = req.user.id;
        const mosqueId = await CourseModel.getMosqueIdForAdmin(adminId);
        res.status(200).json({
            message: "Mosque found successfully",
            mosqueId
        });
    } catch (error) {
        console.error("Error fins=ding mosque id:", error);
        res.status(500).json({ message: "Failed to fine mosque id from admin id ", error: error.message });
    }

}