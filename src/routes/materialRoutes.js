import express from 'express';
import multer from 'multer';
import {
    uploadMaterial,
    getCourseMaterials,
    deleteMaterial,
    trackDownload,
    createSection,
    getSections,
    updateSection,
    deleteSection
} from '../controllers/materialController.js';
import { verifyToken, checkRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Configure multer for memory storage (files go to Firebase)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/jpg',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, images, and documents allowed.'));
        }
    }
});

// Section Management (Teacher only)
router.post('/sections', verifyToken, checkRole(['teacher']), createSection);
router.get('/sections/:courseId', verifyToken, getSections);
router.put('/sections/:sectionId', verifyToken, checkRole(['teacher']), updateSection);
router.delete('/sections/:sectionId', verifyToken, checkRole(['teacher']), deleteSection);

// Material Upload (Teacher only)
router.post('/upload', verifyToken, checkRole(['teacher']), upload.single('file'), uploadMaterial);

// Get Materials (Students & Teachers)
router.get('/course/:courseId', verifyToken, getCourseMaterials);

// Delete Material (Teacher only)
router.delete('/:materialId', verifyToken, checkRole(['teacher']), deleteMaterial);

// Track Download
router.post('/download/:materialId', verifyToken, trackDownload);

export default router;