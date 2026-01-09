import express from 'express';
import { upload } from '../config/upload.js'; // UPDATED: Use local upload config
import {
    uploadMaterial,
    getCourseMaterials,
    deleteMaterial,
    downloadMaterial, // NEW
    trackDownload,
    createSection,
    getSections,
    updateSection,
    deleteSection
} from '../controllers/materialController.js';
import { verifyToken, checkRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Section Management (Teacher only)
router.post('/sections', verifyToken, checkRole(['teacher']), createSection);
router.get('/sections/:courseId', verifyToken, getSections);
router.put('/sections/:sectionId', verifyToken, checkRole(['teacher']), updateSection);
router.delete('/sections/:sectionId', verifyToken, checkRole(['teacher']), deleteSection);

// Material Upload (Teacher only)
router.post(
    '/upload',
    verifyToken,
    checkRole(['teacher']),
    upload.single('file'), // UPDATED: Use local upload
    uploadMaterial
);

// Get Materials (Students & Teachers)
router.get('/course/:courseId', verifyToken, getCourseMaterials);

// Delete Material (Teacher only)
router.delete('/:materialId', verifyToken, checkRole(['teacher']), deleteMaterial);

// NEW: Download material
router.get('/download/:materialId', verifyToken, downloadMaterial);

// Track Download
router.post('/download/:materialId', verifyToken, trackDownload);

export default router;