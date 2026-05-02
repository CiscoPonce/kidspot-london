'use client';

import { Suspense, use } from 'react';
import Link from 'next/link';
import { CheckCircle2, PartyPopper } from 'lucide-react';

interface Props {
  searchParams: Promise<{
    venueId?: string;
    session_id?: string;
  }>;
}

function SuccessContent({ searchParams }: Props) {
  const resolvedSearchParams = use(searchParams);
  
  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 rounded-full bg-green-100 text-green-700 flex items-center justify-center mb-8 animate-bounce">
        <PartyPopper size={48} />
      </div>
      
      <h1 className="font-display text-4xl font-bold mb-4 text-on-background">Sponsorship Active!</h1>
      <p className="text-on-surface-variant max-w-md text-lg mb-10 leading-relaxed">
        Congratulations! Your venue's sponsorship is now active. Your placement in search results will be updated within minutes.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/"
          className="bg-primary-container text-on-primary-container font-bold px-10 py-4 rounded-2xl hover:brightness-95 active:scale-95 transition-all shadow-lg"
        >
          View Search Results
        </Link>
        <Link
          href="/saved"
          className="bg-surface border border-outline-variant text-on-surface font-bold px-10 py-4 rounded-2xl hover:bg-surface-variant transition-all"
        >
          Go to Dashboard
        </Link>
      </div>
      
      <p className="mt-12 text-outline text-xs uppercase tracking-widest font-black">
        Session ID: {resolvedSearchParams.session_id?.slice(0, 20)}...
      </p>
    </div>
  );
}

export default function BillingSuccessPage(props: Props) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold">Loading...</div>}>
      <SuccessContent {...props} />
    </Suspense>
  );
}
