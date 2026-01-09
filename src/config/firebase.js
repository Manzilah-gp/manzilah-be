import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load service account
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../../config/firebase-service-account.json'), 'utf8')
);

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET

  });
}

const db = admin.firestore();
const messaging = admin.messaging();
export const bucket = admin.storage().bucket();

export { admin, db, messaging };