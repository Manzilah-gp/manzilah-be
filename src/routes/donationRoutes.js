// =====================================================
// Donation Routes - API endpoints for donation feature
// ES6 Module syntax for compatibility with your project
// =====================================================

import express from 'express';
import * as DonationController from '../controllers/donationController.js';
import { verifyToken, checkRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All donation routes require authentication
router.use(verifyToken);

// Create payment intent (Step 1: Initialize Stripe payment)
router.post('/create-payment-intent', DonationController.createPaymentIntent);

// Confirm donation (Step 2: After Stripe payment succeeds)
router.post('/confirm', DonationController.confirmDonation);

// Get all donations for a specific event
router.get('/event/:event_id', DonationController.getEventDonations);

// Get donation statistics for an event
router.get('/event/:event_id/stats', DonationController.getEventStats);

// Get logged-in donor's donation history
router.get('/my-donations', DonationController.getDonorHistory);

// Download receipt for a specific donation
router.get('/receipt/:donation_id', DonationController.downloadReceipt);

// Admin: Update fundraising goal for an event
router.put('/event/:event_id/goal', DonationController.updateFundraisingGoal);

export default router;