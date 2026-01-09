import { MaterialModel } from '../models/MaterialModel.js';
import { bucket } from '../config/firebase.js';
import path from 'path';

/**
 * Upload material to Firebase Storage
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

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `${timestamp}_${file.originalname}`;
        const firebasePath = `course-materials/${courseId}/${filename}`;

        // Upload to Firebase
        const fileUpload = bucket.file(firebasePath);
        const blobStream = fileUpload.createWriteStream({
            metadata: {
                contentType: file.mimetype,
                metadata: {
                    uploadedBy: teacherId.toString(),
                    courseId: courseId.toString()
                }
            }
        });

        blobStream.on('error', (error) => {
            console.error('Firebase upload error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to upload to Firebase'
            });
        });

        blobStream.on('finish', async () => {
            // Make file publicly accessible
            await fileUpload.makePublic();

            // Get public URL
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${firebasePath}`;

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
                firebaseUrl: publicUrl,
                firebasePath
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
        });

        blobStream.end(file.buffer);

    } catch (error) {
        console.error('Upload material error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload material',
            error: error.message
        });
    }
};

/**
 * Get all materials for a course
 */
export const getCourseMaterials = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;
        const userRoles = req.user.roles || [];

        // Verify user has access to course
        const hasAccess = await MaterialModel.verifyUserAccess(userId, courseId, userRoles);

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this course'
            });
        }

        // Get materials organized by sections
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
 * Delete material
 */
export const deleteMaterial = async (req, res) => {
    try {
        const { materialId } = req.params;
        const teacherId = req.user.id;

        // Get material info
        const material = await MaterialModel.getMaterialById(materialId);

        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        // Verify ownership
        if (material.uploaded_by !== teacherId) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own materials'
            });
        }

        // Delete from Firebase
        try {
            await bucket.file(material.firebase_path).delete();
        } catch (firebaseError) {
            console.warn('Firebase deletion warning:', firebaseError.message);
            // Continue even if Firebase deletion fails
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
 * Track material download
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

/**
 * Create material section
 */
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

        // Verify teacher owns the course
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

/**
 * Get sections for a course
 */
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

/**
 * Update section
 */
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

/**
 * Delete section
 */
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