// import admin from 'firebase-admin';
// import { readFileSync } from 'fs';
// import { fileURLToPath } from 'url';
// import { dirname, join } from 'path';
// import dotenv from 'dotenv';

// dotenv.config();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// // Load service account
// const serviceAccount = JSON.parse(
//   readFileSync(join(__dirname, '../../config/firebase-service-account.json'), 'utf8')
// );

// // Initialize Firebase Admin
// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//         storageBucket: process.env.FIREBASE_STORAGE_BUCKET

//   });
// }

// const db = admin.firestore();
// const messaging = admin.messaging();
// export const bucket = admin.storage().bucket();

// export { admin, db, messaging };

// src/config/firebase.js (or wherever this file is)

import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Initialize Firebase Admin SDK using environment variables
 * This allows deployment without storing credentials in the repository
 */
const initializeFirebase = () => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      console.log('✅ Firebase already initialized');
      return true;
    }

    // Check if all required Firebase credentials are present
    const hasCredentials = 
      process.env.FIREBASE_PROJECT_ID && 
      process.env.FIREBASE_CLIENT_EMAIL && 
      process.env.FIREBASE_PRIVATE_KEY;

    if (!hasCredentials) {
      console.log('⚠️ Firebase credentials not found - notifications will be disabled');
      console.log('Missing credentials:', {
        projectId: !process.env.FIREBASE_PROJECT_ID,
        clientEmail: !process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: !process.env.FIREBASE_PRIVATE_KEY
      });
      return false;
    }

    // Initialize Firebase Admin with credentials from environment variables
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace escaped newlines (\n) with actual newlines
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });

    console.log('✅ Firebase Admin initialized successfully');
    console.log('📧 Project:', process.env.FIREBASE_PROJECT_ID);
    console.log('🗄️ Storage Bucket:', process.env.FIREBASE_STORAGE_BUCKET);
    
    return true;

  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    return false;
  }
};

// Initialize Firebase on module load
const isInitialized = initializeFirebase();

// Export Firestore database instance (returns null if not initialized)
export const db = isInitialized ? admin.firestore() : null;

// Export Firebase Cloud Messaging instance (returns null if not initialized)
export const messaging = isInitialized ? admin.messaging() : null;

// Export Firebase Storage bucket (returns null if not initialized)
export const bucket = isInitialized ? admin.storage().bucket() : null;

// Export admin instance for advanced usage
export { admin };

// Default export of admin
export default admin;