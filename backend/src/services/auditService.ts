import { db } from '../clients/db.js';
import { logger } from '../config/logger.js';

export interface AuditLogEntry {
  adminId?: string;
  actionType: string;
  targetId?: number;
  payload?: any;
  userAgent?: string;
  ipAddress?: string;
}

export const auditService = {
  /**
   * Log an administrative action
   */
  async logAction(entry: AuditLogEntry) {
    try {
      await db.query(
        `INSERT INTO audit_logs (admin_id, action_type, target_id, payload, user_agent, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          entry.adminId || 'system',
          entry.actionType,
          entry.targetId,
          JSON.stringify(entry.payload || {}),
          entry.userAgent,
          entry.ipAddress
        ]
      );
    } catch (error) {
      logger.error({ err: error, entry }, 'Failed to write audit log');
    }
  },

  /**
   * Get recent audit logs
   */
  async getRecentLogs(limit = 50, offset = 0) {
    const result = await db.query(
      `SELECT * FROM audit_logs 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }
};
