// PURPOSE: Configure multer for local file storage
// REASON: Centralized upload configuration

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads/materials');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Organize by course ID if available
        const courseId = req.body.courseId;
        const coursePath = path.join(uploadDir, `course_${courseId}`);

        // Create course folder if it doesn't exist
        if (!fs.existsSync(coursePath)) {
            fs.mkdirSync(coursePath, { recursive: true });
        }

        cb(null, coursePath);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp_originalname
        const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        cb(null, `${uniqueSuffix}_${nameWithoutExt}${ext}`);
    }
});

// File filter (same as before)
const fileFilter = (req, file, cb) => {
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
};

// Create multer upload instance
export const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
    },
    fileFilter
});