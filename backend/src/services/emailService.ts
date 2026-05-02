import { logger } from '../config/logger.js';

export const emailService = {
  /**
   * Send claim verification email
   */
  async sendClaimVerification(email: string, venueName: string, token: string) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3005'}/claim/verify?token=${token}`;
    
    // In production, this would use a real provider (SendGrid, Postmark, etc.)
    logger.info({
      to: email,
      subject: `Verify your claim for ${venueName}`,
      venueName,
      verificationUrl
    }, 'Email sent (simulated)');

    // Always log to console in dev for easy access
    console.log('\n--- EMAIL SIMULATION ---');
    console.log(`TO: ${email}`);
    console.log(`SUBJECT: Verify your claim for ${venueName}`);
    console.log(`LINK: ${verificationUrl}`);
    console.log('------------------------\n');
  },

  /**
   * Send approval notification
   */
  async sendClaimApproved(email: string, venueName: string, slug: string) {
    const billingUrl = `${process.env.FRONTEND_URL || 'http://localhost:3005'}/venue/${slug}/pricing`;
    
    logger.info({
      to: email,
      subject: `Your claim for ${venueName} has been approved!`,
      billingUrl
    }, 'Approval email sent (simulated)');

    console.log('\n--- EMAIL SIMULATION ---');
    console.log(`TO: ${email}`);
    console.log(`SUBJECT: Claim Approved!`);
    console.log(`LINK: ${billingUrl}`);
    console.log('------------------------\n');
  },

  /**
   * Send login OTP to venue owner
   */
  async sendOwnerOtp(email: string, otp: string) {
    logger.info({
      to: email,
      subject: 'Your KidSpot Owner Login Code',
      otp
    }, 'Login OTP sent (simulated)');

    console.log('\n--- EMAIL SIMULATION ---');
    console.log(`TO: ${email}`);
    console.log(`SUBJECT: Owner Login Code`);
    console.log(`OTP: ${otp}`);
    console.log('------------------------\n');
  }
};
