const crypto = require('crypto');

/**
 * Timing-safe admin authentication middleware.
 * Uses crypto.timingSafeEqual to prevent timing attacks.
 */
const adminAuth = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'] || req.query.admin_key;
  const expectedKey = process.env.ADMIN_KEY;

  if (!expectedKey) {
    console.error('ADMIN_KEY environment variable is not set');
    return res.status(500).json({
      success: false,
      error: 'Authentication configuration error'
    });
  }

  if (!adminKey) {
    return res.status(401).json({
      success: false,
      error: 'Admin key is required'
    });
  }

  try {
    const adminKeyBuffer = Buffer.from(String(adminKey));
    const expectedKeyBuffer = Buffer.from(String(expectedKey));

    if (adminKeyBuffer.length !== expectedKeyBuffer.length) {
      // Still do a comparison to maintain timing if possible
      crypto.timingSafeEqual(expectedKeyBuffer, expectedKeyBuffer);
      return res.status(401).json({
        success: false,
        error: 'Invalid admin key'
      });
    }

    if (crypto.timingSafeEqual(adminKeyBuffer, expectedKeyBuffer)) {
      return next();
    }
  } catch (error) {
    console.error('Auth error:', error.message);
  }

  res.status(401).json({
    success: false,
    error: 'Invalid admin key'
  });
};

module.exports = { adminAuth };
