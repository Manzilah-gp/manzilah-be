// =====================================================
// Donation Model - Handles all donation database operations
// =====================================================

import db from "../config/db.js";

class DonationModel {
  
  // Create a new donation record in the database
  static async create(donationData) {
    const { 
      event_id, 
      donor_id, 
      payment_id, 
      amount_cents, 
      is_anonymous, 
      donor_message,
      stripe_payment_id,
      stripe_charge_id 
    } = donationData;

    const query = `
      INSERT INTO event_donation 
      (event_id, donor_id, payment_id, amount_cents, is_anonymous, donor_message, stripe_payment_id, stripe_charge_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      event_id, 
      donor_id, 
      payment_id, 
      amount_cents, 
      is_anonymous || 0, 
      donor_message || null,
      stripe_payment_id,
      stripe_charge_id
    ]);

    return result.insertId;
  }

  // Get all donations for a specific event
  static async getByEventId(eventId, includeAnonymous = true) {
    let query = `
      SELECT 
        ed.*,
        u.full_name,
        u.email,
        p.gateway,
        p.gateway_charge_id
      FROM event_donation ed
      LEFT JOIN user u ON ed.donor_id = u.id
      LEFT JOIN payment p ON ed.payment_id = p.id
      WHERE ed.event_id = ?
    `;

    // Filter anonymous donations if needed
    if (!includeAnonymous) {
      query += ` AND ed.is_anonymous = 0`;
    }

    query += ` ORDER BY ed.created_at DESC`;

    const [donations] = await db.execute(query, [eventId]);
    return donations;
  }

  // Get all donations by a specific donor
  static async getByDonorId(donorId) {
    const query = `
      SELECT 
        ed.*,
        e.title as event_title,
        e.mosque_id,
        m.name as mosque_name
      FROM event_donation ed
      LEFT JOIN event e ON ed.event_id = e.id
      LEFT JOIN mosque m ON e.mosque_id = m.id
      WHERE ed.donor_id = ?
      ORDER BY ed.created_at DESC
    `;

    const [donations] = await db.execute(query, [donorId]);
    return donations;
  }

  // Get a specific donation by ID
  static async getById(donationId) {
    const query = `
      SELECT 
        ed.*,
        u.full_name,
        u.email,
        e.title as event_title,
        e.mosque_id,
        m.name as mosque_name,
        p.gateway,
        p.gateway_charge_id
      FROM event_donation ed
      LEFT JOIN user u ON ed.donor_id = u.id
      LEFT JOIN event e ON ed.event_id = e.id
      LEFT JOIN mosque m ON e.mosque_id = m.id
      LEFT JOIN payment p ON ed.payment_id = p.id
      WHERE ed.id = ?
    `;

    const [donations] = await db.execute(query, [donationId]);
    return donations[0];
  }

  // Get donation statistics for an event
  static async getEventStatistics(eventId) {
    const query = `
      SELECT 
        COUNT(*) as total_donations,
        SUM(amount_cents) as total_amount_cents,
        AVG(amount_cents) as average_amount_cents,
        MAX(amount_cents) as highest_amount_cents,
        MIN(amount_cents) as lowest_amount_cents
      FROM event_donation
      WHERE event_id = ?
    `;

    const [stats] = await db.execute(query, [eventId]);
    return stats[0];
  }

  // Get top donors for an event (excluding anonymous)
  static async getTopDonors(eventId, limit = 10) {
    const query = `
      SELECT 
        u.full_name,
        SUM(ed.amount_cents) as total_donated_cents,
        COUNT(*) as donation_count
      FROM event_donation ed
      LEFT JOIN user u ON ed.donor_id = u.id
      WHERE ed.event_id = ? AND ed.is_anonymous = 0
      GROUP BY ed.donor_id
      ORDER BY total_donated_cents DESC
      LIMIT ?
    `;

    const [donors] = await db.execute(query, [eventId, limit]);
    return donors;
  }

  // Update receipt URL after generating receipt
  static async updateReceiptUrl(donationId, receiptUrl) {
    const query = `
      UPDATE event_donation 
      SET receipt_url = ?
      WHERE id = ?
    `;

    await db.execute(query, [receiptUrl, donationId]);
  }

  // Generate next receipt number
  static async getNextReceiptNumber() {
    const currentYear = new Date().getFullYear();
    
    // Get or create sequence for current year
    const getQuery = `
      SELECT next_number 
      FROM receipt_sequence 
      WHERE year = ?
      FOR UPDATE
    `;
    
    const [rows] = await db.execute(getQuery, [currentYear]);
    
    let nextNumber;
    if (rows.length === 0) {
      // Create new sequence for this year
      await db.execute(
        'INSERT INTO receipt_sequence (year, next_number) VALUES (?, 1)',
        [currentYear]
      );
      nextNumber = 1;
    } else {
      nextNumber = rows[0].next_number;
      // Increment for next receipt
      await db.execute(
        'UPDATE receipt_sequence SET next_number = next_number + 1 WHERE year = ?',
        [currentYear]
      );
    }

    // Format: RCPT-2025-00001
    return `RCPT-${currentYear}-${String(nextNumber).padStart(5, '0')}`;
  }
}

export default DonationModel;