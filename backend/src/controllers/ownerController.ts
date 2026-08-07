import { Request, Response } from 'express';
import { ownerService } from '../services/ownerService.js';
import { emailService } from '../services/emailService.js';
import { logger } from '../config/logger.js';

export const ownerController = {
  /**
   * POST /api/owner/login
   */
  async login(req: Request, res: Response) {
    try {
      const { email } = req.body ?? {};

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      const otp = await ownerService.requestOtp(email);

      if (otp) {
        // Send OTP via email (simulated for now)
        await emailService.sendOwnerOtp(email, otp);
      }

      // We return success even if email wasn't found (for security/privacy)
      return res.json({
        success: true,
        message: 'If an account exists, an OTP has been sent to your email.'
      });
    } catch (error) {
      logger.error({ err: error }, 'Error in owner login controller');
      return res.status(500).json({
        success: false,
        error: 'Failed to process login request'
      });
    }
  },

  /**
   * POST /api/owner/verify
   */
  async verify(req: Request, res: Response) {
    try {
      const { email, otp } = req.body ?? {};

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          error: 'Email and OTP are required'
        });
      }

      const result = await ownerService.verifyOtp(email, otp);

      if (!result) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired OTP'
        });
      }

      return res.json({
        success: true,
        token: result.token,
        venues: result.venues
      });
    } catch (error) {
      logger.error({ err: error }, 'Error in owner verify controller');
      return res.status(500).json({
        success: false,
        error: 'Failed to verify OTP'
      });
    }
  },

  /**
   * GET /api/owner/venues/:id/stats
   */
  async getVenueStats(req: Request, res: Response) {
    try {
      const venueId = parseInt(String(req.params.id ?? ''), 10);
      
      // Verification that the owner owns this venue is handled by middleware
      const stats = await ownerService.getVenueStats(venueId);

      return res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error({ err: error }, 'Error in getVenueStats controller');
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch venue statistics'
      });
    }
  }
};
