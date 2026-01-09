// =====================================================
// Donation Controller - Individual Function Exports
// Backend conversion: Receives dollars, stores cents
// =====================================================

import DonationModel from '../models/DonationModel.js';
import db from '../config/db.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Stripe from 'stripe';

// Get __dirname equivalent in ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_your_key_here');

// =====================================================
// Helper function to validate event is fundraising type
// =====================================================
const validateFundraisingEvent = async (eventId) => {
  const [events] = await db.execute(
    'SELECT * FROM event WHERE id = ? AND event_type = "fundraising"',
    [eventId]
  );

  if (events.length === 0) {
    return { 
      valid: false, 
      message: 'Event not found or is not a fundraising event' 
    };
  }

  const event = events[0];

  // Check if event has fundraising goal set
  if (!event.fundraising_goal_cents || event.fundraising_goal_cents <= 0) {
    return { 
      valid: false, 
      message: 'This fundraising event does not have a goal set yet' 
    };
  }

  // Check if event is already completed
  if (event.status === 'completed') {
    return { 
      valid: false, 
      message: 'This fundraising event has already reached its goal' 
    };
  }

  // Check if event is cancelled
  if (event.status === 'cancelled') {
    return { 
      valid: false, 
      message: 'This event has been cancelled' 
    };
  }

  return { valid: true, event };
};

// =====================================================
// Create a payment intent with Stripe
// Receives DOLLARS from frontend, converts to CENTS for Stripe
// =====================================================
export const createPaymentIntent = async (req, res) => {
  try {
    const { event_id, amount, donor_message, is_anonymous } = req.body;  // ✅ amount in DOLLARS
    const donor_id = req.user.id;

    console.log('📥 Received amount (dollars):', amount);

    if (!event_id || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Event ID and amount are required' 
      });
    }

    // Validate event is fundraising type
    const validation = await validateFundraisingEvent(event_id);
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: validation.message 
      });
    }

    const event = validation.event;

    // ✅ CONVERT TO CENTS FOR COMPARISON
    const amount_cents = Math.round(amount * 100);
    const min_cents = event.min_donation_cents;

    console.log('💰 Comparison:', { amount_cents, min_cents });

    // Check minimum donation (both in cents)
    if (amount_cents < min_cents) {
      return res.status(400).json({ 
        success: false, 
        message: `Minimum donation is $${(min_cents / 100).toFixed(2)}` 
      });
    }

    // ✅ STRIPE RECEIVES CENTS (Required by Stripe API)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,  // Stripe needs cents
      currency: 'usd',
      metadata: {
        event_id,
        donor_id,
        donor_message: donor_message || '',
        is_anonymous: is_anonymous ? '1' : '0',
        amount_dollars: amount  // Store original for reference
      },
      description: `Donation for: ${event.title}`,
    });

    console.log('✅ Payment intent created:', paymentIntent.id);

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create payment intent',
      error: error.message 
    });
  }
};

// =====================================================
// Confirm donation after successful Stripe payment
// Stripe returns CENTS, save to DB as CENTS
// =====================================================
// =====================================================
// Confirm donation after successful Stripe payment
// FIXED: Matches actual payment table schema
// =====================================================
export const confirmDonation = async (req, res) => {
  try {
    const { payment_intent_id } = req.body;
    const donor_id = req.user.id;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment not successful' 
      });
    }

    // ✅ CHECK FOR DUPLICATES
    const [existing] = await db.execute(
      'SELECT id FROM event_donation WHERE stripe_payment_id = ?',
      [payment_intent_id]
    );

    if (existing.length > 0) {
      console.log('⚠️ Donation already processed');
      return res.json({
        success: true,
        message: 'Donation already processed',
        donation_id: existing[0].id
      });
    }

    const event_id = paymentIntent.metadata.event_id;
    const amount_cents = paymentIntent.amount;

    console.log('💰 Saving to DB (cents):', amount_cents);

    // Create payment record
    const [paymentResult] = await db.execute(
      `INSERT INTO payment (user_id, amount_cents, currency, gateway, gateway_charge_id, status)
       VALUES (?, ?, 'usd', 'stripe', ?, 'completed')`,
      [donor_id, amount_cents, payment_intent_id]
    );

    // Create donation record
    const donationId = await DonationModel.create({
      event_id,
      donor_id,
      payment_id: paymentResult.insertId,
      amount_cents: amount_cents,
      is_anonymous: paymentIntent.metadata.is_anonymous === '1' ? 1 : 0,
      donor_message: paymentIntent.metadata.donor_message || null,
      stripe_payment_id: payment_intent_id,
      stripe_charge_id: paymentIntent.latest_charge
    });

    // Generate receipt
    const receiptNumber = await DonationModel.getNextReceiptNumber();
    const donation = await DonationModel.getById(donationId);
    const receiptPath = await generateReceipt(donation, receiptNumber);
    await DonationModel.updateReceiptUrl(donationId, `/receipts/${path.basename(receiptPath)}`);

    res.json({
      success: true,
      message: 'Donation successful!',
      donation_id: donationId,
      receipt_number: receiptNumber
    });

  } catch (error) {
    console.error('Error confirming donation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process donation',
      error: error.message 
    });
  }
};

// =====================================================
// Get all donations for an event (with privacy settings)
// =====================================================
export const getEventDonations = async (req, res) => {
  try {
    const { event_id } = req.params;

    // Verify event is fundraising type
    const [events] = await db.execute(
      'SELECT event_type, show_donors FROM event WHERE id = ?',
      [event_id]
    );

    if (events.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    const event = events[0];

    // Only allow viewing donations for fundraising events
    if (event.event_type !== 'fundraising') {
      return res.status(400).json({ 
        success: false, 
        message: 'This is not a fundraising event' 
      });
    }

    const donations = await DonationModel.getByEventId(event_id, true);
    
    // Hide donor info based on event settings and donor preferences
    const sanitizedDonations = donations.map(donation => {
      if (donation.is_anonymous || !event.show_donors) {
        return {
          ...donation,
          first_name: 'Anonymous',
          last_name: '',
          email: null
        };
      }
      return donation;
    });

    res.json({
      success: true,
      donations: sanitizedDonations
    });

  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch donations' 
    });
  }
};

// =====================================================
// Get donor's donation history
// =====================================================
export const getDonorHistory = async (req, res) => {
  try {
    const donor_id = req.user.id;

    const donations = await DonationModel.getByDonorId(donor_id);

    res.json({
      success: true,
      donations
    });

  } catch (error) {
    console.error('Error fetching donor history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch donation history' 
    });
  }
};

// =====================================================
// Get donation statistics for an event
// =====================================================
export const getEventStats = async (req, res) => {
  try {
    const { event_id } = req.params;

    // Verify event is fundraising type
    const [events] = await db.execute(
      'SELECT event_type FROM event WHERE id = ?',
      [event_id]
    );

    if (events.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    if (events[0].event_type !== 'fundraising') {
      return res.status(400).json({ 
        success: false, 
        message: 'This is not a fundraising event' 
      });
    }

    const stats = await DonationModel.getEventStatistics(event_id);

    res.json({
      success: true,
      statistics: stats,
    });

  } catch (error) {
    console.error('Error fetching donation stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch statistics' 
    });
  }
};

// =====================================================
// Download receipt as PDF
// =====================================================
export const downloadReceipt = async (req, res) => {
  try {
    const { donation_id } = req.params;
    const donor_id = req.user.id;

    const donation = await DonationModel.getById(donation_id);

    if (!donation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Donation not found' 
      });
    }

    // Verify the user owns this donation
    if (donation.donor_id !== donor_id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    // Check if receipt exists
    if (!donation.receipt_url) {
      return res.status(404).json({ 
        success: false, 
        message: 'Receipt not found' 
      });
    }

    const receiptPath = path.join(__dirname, '../../receipts', path.basename(donation.receipt_url));
    
    if (!fs.existsSync(receiptPath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Receipt file not found' 
      });
    }

    res.download(receiptPath);

  } catch (error) {
    console.error('Error downloading receipt:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to download receipt' 
    });
  }
};

// =====================================================
// Helper function to generate PDF receipt
// =====================================================
const generateReceipt = async (donation, receiptNumber) => {
  return new Promise((resolve, reject) => {
    try {
      // Create receipts directory if it doesn't exist
      const receiptsDir = path.join(__dirname, '../../receipts');
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }

      const filename = `receipt-${donation.id}-${Date.now()}.pdf`;
      const filepath = path.join(receiptsDir, filename);

      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // Add header
      doc.fontSize(20).text('DONATION RECEIPT', { align: 'center' });
      doc.moveDown();

      // Add receipt details
      doc.fontSize(12);
      doc.text(`Receipt Number: ${receiptNumber}`);
      doc.text(`Date: ${new Date(donation.created_at).toLocaleDateString()}`);
      doc.moveDown();

      // Donor information
      doc.fontSize(14).text('Donor Information:', { underline: true });
      doc.fontSize(12);
      if (donation.is_anonymous) {
        doc.text('Anonymous Donor');
      } else {
        doc.text(`Name: ${donation.first_name} ${donation.last_name}`);
        doc.text(`Email: ${donation.email}`);
      }
      doc.moveDown();

      // Donation details
      doc.fontSize(14).text('Donation Details:', { underline: true });
      doc.fontSize(12);
      doc.text(`Event: ${donation.event_title}`);
      doc.text(`Mosque: ${donation.mosque_name}`);
      doc.text(`Amount: $${(donation.amount_cents / 100).toFixed(2)}`);
      doc.text(`Payment Method: ${donation.payment_method || 'Stripe'}`);
      doc.text(`Transaction ID: ${donation.stripe_payment_id}`);
      
      if (donation.donor_message) {
        doc.moveDown();
        doc.text(`Message: ${donation.donor_message}`);
      }

      doc.moveDown(2);

      // Footer
      doc.fontSize(10).text(
        'Thank you for your generous donation! This receipt is for your records.',
        { align: 'center', color: 'gray' }
      );

      doc.fontSize(8).text(
        'This is a computer-generated receipt and does not require a signature.',
        { align: 'center', color: 'gray' }
      );

      doc.end();

      stream.on('finish', () => {
        resolve(filepath);
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};

// =====================================================
// Admin: Update fundraising goal for an event
// Receives DOLLARS from frontend, converts to CENTS for DB
// =====================================================
export const updateFundraisingGoal = async (req, res) => {
  try {
    const { event_id } = req.params;
    const { fundraising_goal, min_donation } = req.body;  // Receive DOLLARS
    const user_id = req.user.id;

    console.log('📥 Received (dollars):', { fundraising_goal, min_donation });

    // Check if event exists and is fundraising type
    const [events] = await db.execute(
      `SELECT e.*, m.mosque_admin_id 
       FROM event e 
       JOIN mosque m ON e.mosque_id = m.id 
       WHERE e.id = ?`,
      [event_id]
    );

    if (events.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    const event = events[0];

    // Verify event is fundraising type
    if (event.event_type !== 'fundraising') {
      return res.status(400).json({ 
        success: false, 
        message: 'This is not a fundraising event. Only fundraising events can have goals.' 
      });
    }

    // Verify user is the mosque admin
if (Number(event.mosque_admin_id) !== Number(user_id)) {
  return res.status(403).json({ 
    success: false, 
    message: 'Only mosque admin can update fundraising goals' 
  });
}

    // Validate goal amount
    if (fundraising_goal <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Fundraising goal must be greater than zero' 
      });
    }

    // ✅ CONVERT TO CENTS
    const goal_cents = Math.round(fundraising_goal * 100);
    const min_cents = Math.round((min_donation || 10) * 100);

    console.log('💰 Converted (cents):', { goal_cents, min_cents });

    // Update event
    await db.execute(
      `UPDATE event 
       SET fundraising_goal_cents = ?, 
           min_donation_cents = ?,
           show_donors = COALESCE(show_donors, 1),
           allow_anonymous = COALESCE(allow_anonymous, 1)
       WHERE id = ?`,
      [goal_cents, min_cents, event_id]
    );

    res.json({
      success: true,
      message: 'Fundraising goal updated successfully'
    });

  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update fundraising goal' 
    });
  }
};