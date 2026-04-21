import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const verifyHmac = (req: Request, res: Response, next: NextFunction) => {
  try {
    const signatureHeader = req.headers['x-ingest-signature'] as string;
    const timestampHeader = req.headers['x-ingest-timestamp'] as string;

    if (!signatureHeader || !timestampHeader) {
      return res.status(401).json({ success: false, error: 'Missing signature or timestamp headers' });
    }

    const secret = process.env.INGEST_SIGNING_SECRET;
    if (!secret) {
      console.error('INGEST_SIGNING_SECRET is not configured');
      return res.status(500).json({ success: false, error: 'Internal server error configuration' });
    }

    // Verify timestamp to prevent replay attacks (5 minutes = 300 seconds)
    const requestTime = parseInt(timestampHeader, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (isNaN(requestTime) || Math.abs(currentTime - requestTime) > 300) {
      return res.status(401).json({ success: false, error: 'Request timestamp is invalid or expired' });
    }

    // Prepare the payload to sign. 
    // Format: "timestamp.body" or just "timestamp." if no body.
    let rawBody = '';
    // If we setup rawBody parsing in express
    if ((req as any).rawBody) {
      rawBody = (req as any).rawBody;
    } else if (req.body && Object.keys(req.body).length > 0) {
      rawBody = JSON.stringify(req.body);
    }

    const payloadToSign = `${timestampHeader}.${rawBody}`;
    
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadToSign);
    const expectedSignature = `sha256=${hmac.digest('hex')}`;

    // Use timingSafeEqual to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature);
    const actualBuffer = Buffer.from(signatureHeader);

    if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
      return res.status(403).json({ success: false, error: 'Invalid signature' });
    }

    next();
  } catch (error) {
    console.error('HMAC Verification error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during verification' });
  }
};
