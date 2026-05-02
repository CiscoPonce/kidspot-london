'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  searchParams: Promise<{
    token?: string;
  }>;
}

export default function VerifyClaimPage({ searchParams }: Props) {
  const resolvedSearchParams = use(searchParams);
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      const token = resolvedSearchParams.token;

      if (!token) {
        setStatus('error');
        setError('No verification token provided.');
        return;
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/venues/claim/verify?token=${token}`);
        const data = await response.json();

        if (data.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setError(data.error || 'Invalid or expired verification token.');
        }
      } catch (err) {
        setStatus('error');
        setError('An unexpected error occurred during verification.');
      }
    };

    verifyToken();
  }, [resolvedSearchParams.token]);

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center p-6 text-center">
      {status === 'verifying' && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <h1 className="font-display text-2xl font-bold">Verifying your claim...</h1>
        </div>
      )}

      {status === 'success' && (
        <>
          <div className="w-20 h-20 rounded-3xl bg-green-100 text-green-700 flex items-center justify-center mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="font-display text-3xl font-bold mb-4">Email Verified!</h1>
          <p className="text-on-surface-variant max-w-md mb-8">
            Thank you for verifying your email. Your claim is now with our team for review. 
            We'll notify you via email as soon as it's approved.
          </p>
          <Link
            href="/"
            className="bg-primary-container text-on-primary-container font-semibold px-8 py-3 rounded-2xl hover:brightness-95 active:scale-95 transition-all"
          >
            Return Home
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-20 h-20 rounded-3xl bg-red-100 text-red-700 flex items-center justify-center mb-6">
            <XCircle size={40} />
          </div>
          <h1 className="font-display text-3xl font-bold mb-4">Verification Failed</h1>
          <p className="text-on-surface-variant max-w-md mb-8">
            {error}
          </p>
          <div className="flex gap-4">
            <Link
              href="/"
              className="bg-surface border border-outline-variant text-on-surface font-semibold px-8 py-3 rounded-2xl hover:bg-surface-variant transition-all"
            >
              Go to Home
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
