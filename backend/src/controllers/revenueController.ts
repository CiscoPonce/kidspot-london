import { Request, Response } from 'express';
import { revenueService } from '../services/revenueService.js';
import { auditService } from '../services/auditService.js';
import { logger } from '../config/logger.js';

export const revenueController = {
  /**
   * GET /api/admin/revenue/stats
   */
  async getStats(req: Request, res: Response) {
    try {
      const stats = await revenueService.getRevenueStats();
      return res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error({ err: error }, 'Error in getRevenueStats controller');
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch revenue statistics'
      });
    }
  },

  /**
   * GET /api/admin/audit-logs
   */
  async getAuditLogs(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const logs = await auditService.getRecentLogs(limit, offset);
      
      return res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      logger.error({ err: error }, 'Error in getAuditLogs controller');
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch audit logs'
      });
    }
  },

  /**
   * GET /api/admin/sponsors
   */
  async listSponsors(req: Request, res: Response) {
    try {
      const sponsors = await revenueService.listSponsors();
      return res.json({
        success: true,
        data: sponsors
      });
    } catch (error) {
      logger.error({ err: error }, 'Error in listSponsors controller');
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch sponsor list'
      });
    }
  }
};
