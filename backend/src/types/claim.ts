export type ClaimStatus = 'unclaimed' | 'pending' | 'verified' | 'rejected';

export interface VenueClaim {
  id: number;
  venueId: number;
  email: string;
  fullName: string;
  verificationToken: string;
  verifiedAt: Date | null;
  adminApprovedAt: Date | null;
  adminRejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
}

export interface ClaimRequest {
  venueId: number;
  email: string;
  fullName: string;
}

export interface ClaimApprovalRequest {
  claimId: number;
  approved: boolean;
  rejectionReason?: string;
}
