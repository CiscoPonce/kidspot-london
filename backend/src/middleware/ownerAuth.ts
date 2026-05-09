import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { logger } from '../config/logger.js';

export interface OwnerRequest extends Request {
  owner?: {
    email: string;
    venueIds: number[];
  };
}

/**
 * Middleware to verify owner JWT
 */
export const ownerAuth = (req: OwnerRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authorization token required'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    req.owner = decoded;
    next();
  } catch (error) {
    logger.error({ err: error }, 'Invalid owner token');
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

/**
 * Middleware to ensure the owner has access to the requested venue
 */
export const ensureVenueAccess = (req: OwnerRequest, res: Response, next: NextFunction) => {
  const venueId = parseInt(String(req.params.id ?? ''), 10);

  if (!req.owner || !req.owner.venueIds.includes(venueId)) {
    return res.status(403).json({
      success: false,
      error: 'You do not have access to this venue'
    });
  }

  next();
};
