import { db } from '../clients/db.js';
import { logger } from '../config/logger.js';
import { VenueClaim, ClaimRequest } from '../types/claim.js';
import { auditService } from './auditService.js';
import crypto from 'crypto';

export const claimService = {
  /**
   * Initiate a new claim for a venue
   */
  async createClaim(request: ClaimRequest): Promise<VenueClaim | null> {
    try {
      // 1. Check if venue already has a verified or pending claim
      const venueResult = await db.query(
        'SELECT current_claim_status FROM venues WHERE id = $1',
        [request.venueId]
      );

      if (venueResult.rows.length === 0) {
        throw new Error('Venue not found');
      }

      const status = venueResult.rows[0].current_claim_status;
      if (status === 'verified' || status === 'pending') {
        throw new Error(`Venue already has a ${status} claim`);
      }

      // 2. Generate verification token
      const token = crypto.randomBytes(32).toString('hex');

      // 3. Insert claim record
      const result = await db.query(
        `INSERT INTO venue_claims (venue_id, email, full_name, verification_token)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [request.venueId, request.email, request.fullName, token]
      );

      // 4. Update venue status to pending
      await db.query(
        "UPDATE venues SET current_claim_status = 'pending' WHERE id = $1",
        [request.venueId]
      );

      return result.rows[0] as VenueClaim;
    } catch (error: any) {
      logger.error({ err: error, request }, 'Error creating venue claim');
      throw error;
    }
  },

  /**
   * Verify a claim via email token
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      const result = await db.query(
        'UPDATE venue_claims SET verified_at = NOW() WHERE verification_token = $1 AND verified_at IS NULL RETURNING venue_id',
        [token]
      );

      if (result.rows.length === 0) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ err: error, token }, 'Error verifying claim token');
      return false;
    }
  },

  /**
   * Approve a verified claim (Admin only)
   */
  async approveClaim(claimId: number): Promise<boolean> {
    try {
      const claimResult = await db.query(
        'SELECT venue_id, email FROM venue_claims WHERE id = $1 AND verified_at IS NOT NULL AND admin_approved_at IS NULL',
        [claimId]
      );

      if (claimResult.rows.length === 0) {
        throw new Error('Claim not found or not verified by user');
      }

      const { venue_id, email } = claimResult.rows[0];

      // 1. Mark claim as approved
      await db.query(
        'UPDATE venue_claims SET admin_approved_at = NOW() WHERE id = $1',
        [claimId]
      );

      // 2. Update venue to verified and set claim email
      await db.query(
        "UPDATE venues SET current_claim_status = 'verified', claim_email = $1, claimed_at = NOW() WHERE id = $2",
        [email, venue_id]
      );

      // 3. Log the action
      await auditService.logAction({
        actionType: 'claim_approved',
        targetId: venue_id,
        payload: { claimId, email }
      });

      return true;
    } catch (error: any) {
      logger.error({ err: error, claimId }, 'Error approving venue claim');
      throw error;
    }
  },

  /**
   * Reject a claim (Admin only)
   */
  async rejectClaim(claimId: number, reason: string): Promise<boolean> {
    try {
      const claimResult = await db.query(
        'UPDATE venue_claims SET admin_rejected_at = NOW(), rejection_reason = $1 WHERE id = $2 RETURNING venue_id',
        [reason, claimId]
      );

      if (claimResult.rows.length === 0) {
        return false;
      }

      const { venue_id } = claimResult.rows[0];

      // Revert venue status to unclaimed
      await db.query(
        "UPDATE venues SET current_claim_status = 'unclaimed' WHERE id = $1",
        [venue_id]
      );

      // Log the action
      await auditService.logAction({
        actionType: 'claim_rejected',
        targetId: venue_id,
        payload: { claimId, reason }
      });

      return true;
    } catch (error) {
      logger.error({ err: error, claimId }, 'Error rejecting venue claim');
      return false;
    }
  },

  /**
   * Get claim details by token
   */
  async getClaimByToken(token: string): Promise<any | null> {
    const result = await db.query(
      `SELECT c.*, v.name as venue_name, v.slug as venue_slug
       FROM venue_claims c
       JOIN venues v ON c.venue_id = v.id
       WHERE c.verification_token = $1`,
      [token]
    );
    return result.rows[0] || null;
  }
};
