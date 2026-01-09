import { MaterialModel } from '../models/MaterialModel.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Upload material to local server storage
 */
export const uploadMaterial = async (req, res) => {
    try {
        const { courseId, sectionId, title, description, materialLabel } = req.body;
        const teacherId = req.user.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        if (!courseId || !title) {
            return res.status(400).json({
                success: false,
                message: 'Course ID and title are required'
            });
        }

        // File is already saved by multer
        // Generate relative path for database (without full server path)
        const relativePath = path.relative(
            path.join(__dirname, '../../'),
            file.path
        );

        // Generate public URL for downloading
        const publicUrl = `/uploads/materials/course_${courseId}/${file.filename}`;

        // Save to database
        const materialData = {
            courseId,
            sectionId: sectionId || null,
            uploadedBy: teacherId,
            title,
            description: description || null,
            materialLabel: materialLabel || 'General',
            fileName: file.originalname,
            fileSize: file.size,
            fileType: getFileType(file.mimetype),
            localUrl: publicUrl,
            localPath: relativePath
        };

        const materialId = await MaterialModel.createMaterial(materialData);

        res.status(201).json({
            success: true,
            message: 'Material uploaded successfully',
            data: {
                id: materialId,
                url: publicUrl
            }
        });

    } catch (error) {
        console.error('Upload material error:', error);

        // Clean up file if database insertion fails
        if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            message: 'Failed to upload material',
            error: error.message
        });
    }
};

/**
 * Get all materials for a course (NO CHANGES NEEDED)
 */
export const getCourseMaterials = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;
        const userRoles = req.user.roles || [];

        const hasAccess = await MaterialModel.verifyUserAccess(userId, courseId, userRoles);

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this course'
            });
        }

        const materials = await MaterialModel.getCourseMaterials(courseId);

        res.status(200).json({
            success: true,
            data: materials
        });

    } catch (error) {
        console.error('Get materials error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch materials',
            error: error.message
        });
    }
};

/**
 * Delete material (UPDATED)
 */
export const deleteMaterial = async (req, res) => {
    try {
        const { materialId } = req.params;
        const teacherId = req.user.id;

        const material = await MaterialModel.getMaterialById(materialId);

        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        if (material.uploaded_by !== teacherId) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own materials'
            });
        }

        // Delete physical file
        const filePath = path.join(__dirname, '../../', material.local_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete from database
        await MaterialModel.deleteMaterial(materialId);

        res.status(200).json({
            success: true,
            message: 'Material deleted successfully'
        });

    } catch (error) {
        console.error('Delete material error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete material',
            error: error.message
        });
    }
};

/**
 * Download/serve material file (NEW)
 */
export const downloadMaterial = async (req, res) => {
    try {
        const { materialId } = req.params;
        const userId = req.user.id;

        const material = await MaterialModel.getMaterialById(materialId);

        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        // Verify user has access
        const userRoles = req.user.roles || [];
        const hasAccess = await MaterialModel.verifyUserAccess(
            userId,
            material.course_id,
            userRoles
        );

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Track download
        await MaterialModel.trackDownload(materialId, userId);

        // Serve file
        const filePath = path.join(__dirname, '../../', material.local_path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found on server'
            });
        }

        res.download(filePath, material.file_name);

    } catch (error) {
        console.error('Download material error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download material',
            error: error.message
        });
    }
};

/**
 * Track download (NO CHANGES)
 */
export const trackDownload = async (req, res) => {
    try {
        const { materialId } = req.params;
        const userId = req.user.id;

        await MaterialModel.trackDownload(materialId, userId);

        res.status(200).json({
            success: true,
            message: 'Download tracked'
        });

    } catch (error) {
        console.error('Track download error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to track download'
        });
    }
};

// Section management methods (NO CHANGES)
export const createSection = async (req, res) => {
    try {
        const { courseId, sectionName, sectionOrder } = req.body;
        const teacherId = req.user.id;

        if (!courseId || !sectionName) {
            return res.status(400).json({
                success: false,
                message: 'Course ID and section name are required'
            });
        }

        const ownsCourse = await MaterialModel.verifyCourseTeacher(teacherId, courseId);

        if (!ownsCourse) {
            return res.status(403).json({
                success: false,
                message: 'You are not the teacher of this course'
            });
        }

        const sectionId = await MaterialModel.createSection({
            courseId,
            sectionName,
            sectionOrder: sectionOrder || 0
        });

        res.status(201).json({
            success: true,
            message: 'Section created successfully',
            data: { id: sectionId }
        });

    } catch (error) {
        console.error('Create section error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create section',
            error: error.message
        });
    }
};

export const getSections = async (req, res) => {
    try {
        const { courseId } = req.params;
        const sections = await MaterialModel.getSections(courseId);

        res.status(200).json({
            success: true,
            data: sections
        });

    } catch (error) {
        console.error('Get sections error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sections',
            error: error.message
        });
    }
};

export const updateSection = async (req, res) => {
    try {
        const { sectionId } = req.params;
        const { sectionName, sectionOrder } = req.body;

        await MaterialModel.updateSection(sectionId, {
            sectionName,
            sectionOrder
        });

        res.status(200).json({
            success: true,
            message: 'Section updated successfully'
        });

    } catch (error) {
        console.error('Update section error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update section',
            error: error.message
        });
    }
};

export const deleteSection = async (req, res) => {
    try {
        const { sectionId } = req.params;
        await MaterialModel.deleteSection(sectionId);

        res.status(200).json({
            success: true,
            message: 'Section deleted successfully'
        });

    } catch (error) {
        console.error('Delete section error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete section',
            error: error.message
        });
    }
};

// Helper function
function getFileType(mimetype) {
    if (mimetype.includes('pdf')) return 'pdf';
    if (mimetype.includes('image')) return 'image';
    if (mimetype.includes('word') || mimetype.includes('document')) return 'document';
    return 'other';
}