import { Request, Response } from 'express';
import { claimService } from '../services/claimService.js';
import { emailService } from '../services/emailService.js';
import { venueService } from '../services/venueService.js';
import { logger } from '../config/logger.js';

export const claimController = {
  /**
   * POST /api/venues/:id/claim
   */
  async initiateClaim(req: Request, res: Response) {
    try {
      const venueId = parseInt(String(req.params.id ?? ''), 10);
      const { email, fullName } = req.body;

      if (isNaN(venueId) || !email || !fullName) {
        return res.status(400).json({
          success: false,
          error: 'Venue ID, email, and full name are required'
        });
      }

      // Get venue name for email (numeric id supplied by route param)
      const venue = await venueService.getVenueById(venueId);
      if (!venue) {
        return res.status(404).json({
          success: false,
          error: 'Venue not found'
        });
      }

      const claim = await claimService.createClaim({ venueId, email, fullName });
      
      if (claim) {
        await emailService.sendClaimVerification(email, venue.name, claim.verificationToken);
      }

      return res.json({
        success: true,
        message: 'Claim initiated. Please check your email to verify.'
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Error in initiateClaim controller');
      return res.status(error.message.includes('already') ? 409 : 500).json({
        success: false,
        error: error.message || 'Failed to initiate claim'
      });
    }
  },

  /**
   * GET /api/venues/claim/verify
   */
  async verifyClaim(req: Request, res: Response) {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Token is required'
        });
      }

      const success = await claimService.verifyToken(token);

      if (!success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      return res.json({
        success: true,
        message: 'Email verified successfully. Your claim is now pending admin approval.'
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Error in verifyClaim controller');
      return res.status(500).json({
        success: false,
        error: 'Failed to verify claim'
      });
    }
  },

  /**
   * POST /api/admin/claims/:id/approve
   */
  async approveClaim(req: Request, res: Response) {
    try {
      const claimId = parseInt(String(req.params.id ?? ''), 10);

      if (isNaN(claimId)) {
        return res.status(400).json({
          success: false,
          error: 'Valid claim ID is required'
        });
      }

      // Need claim details for email
      // We'll add a helper to get claim by ID if needed, but for now we'll assume admin approval flow
      // Actually, approveClaim in service returns true on success.
      
      const success = await claimService.approveClaim(claimId);

      if (success) {
        // We'll need the email and venue slug to send the next steps email
        // For simplicity in this step, we'll assume the service handles internal state
        // but we'll need to fetch details to send the notification
        const result = await db_query_hack(claimId); // Using a placeholder for now
        if (result) {
          await emailService.sendClaimApproved(result.email, result.venue_name, result.venue_slug);
        }
      }

      return res.json({
        success: true,
        message: 'Claim approved and owner notified.'
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Error in approveClaim controller');
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to approve claim'
      });
    }
  }
};

// Temporary helper until I update the service or db client
async function db_query_hack(claimId: number) {
  const { db } = await import('../clients/db.js');
  const result = await db.query(
    'SELECT c.email, v.name as venue_name, v.slug as venue_slug FROM venue_claims c JOIN venues v ON c.venue_id = v.id WHERE c.id = $1',
    [claimId]
  );
  return result.rows[0];
}
