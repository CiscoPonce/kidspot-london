'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ShieldCheck, Mail, User } from 'lucide-react';
import { getVenueBySlug } from '@/lib/api';

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default function ClaimPage({ params }: Props) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Get venue ID first
      const venueRes = await getVenueBySlug(resolvedParams.slug);
      const venueId = venueRes.data.basic.id;

      // 2. Submit claim
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/venues/${venueId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        setError(data.error || 'Failed to submit claim');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-green-100 text-green-700 flex items-center justify-center mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h1 className="font-display text-3xl font-bold mb-4">Claim Initiated!</h1>
        <p className="text-on-surface-variant max-w-md mb-8">
          We've sent a verification link to <span className="font-bold text-on-surface">{email}</span>. 
          Please check your inbox and click the link to verify your ownership.
        </p>
        <Link
          href="/"
          className="bg-primary-container text-on-primary-container font-semibold px-8 py-3 rounded-2xl hover:brightness-95 active:scale-95 transition-all"
        >
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background pb-24">
      <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur-md border-b border-outline-variant/60">
        <div className="mx-auto max-w-2xl flex items-center gap-4 px-4 py-3">
          <button 
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-surface-container transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-display text-xl font-bold">Claim Listing</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-6 py-12">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-4">
            <ShieldCheck size={16} />
            Secure Verification
          </div>
          <h2 className="font-display text-3xl font-bold mb-3">Is this your venue?</h2>
          <p className="text-on-surface-variant">
            Verify your ownership to manage details, respond to reviews, and upgrade to premium features.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-on-surface-variant ml-1 mb-2 block">Full Name</span>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Smith"
                  className="w-full bg-surface border border-outline-variant rounded-2xl py-4 pl-12 pr-4 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary-container transition-all outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-on-surface-variant ml-1 mb-2 block">Business Email</span>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@business.com"
                  className="w-full bg-surface border border-outline-variant rounded-2xl py-4 pl-12 pr-4 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary-container transition-all outline-none"
                />
              </div>
              <p className="mt-2 text-[11px] text-outline italic ml-1">
                We'll send a verification link to this address.
              </p>
            </label>
          </div>

          {error && (
            <div className="p-4 bg-error-container text-error rounded-2xl text-sm font-medium border border-error/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary-container text-on-primary-container font-bold py-4 rounded-2xl hover:brightness-95 active:scale-95 disabled:opacity-50 transition-all shadow-[inset_0_-2px_0_rgba(0,0,0,0.06)] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-on-primary-container border-t-transparent rounded-full animate-spin" />
            ) : (
              'Submit Claim Request'
            )}
          </button>
        </form>

        <div className="mt-12 p-6 bg-surface-container rounded-3xl border border-outline-variant">
          <h3 className="font-title-sm text-sm font-bold mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">info</span>
            How it works
          </h3>
          <ul className="space-y-3 text-xs text-on-surface-variant leading-relaxed">
            <li className="flex gap-3">
              <span className="font-bold text-primary">1.</span>
              Submit your business email and name through this form.
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">2.</span>
              Click the verification link sent to your inbox.
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">3.</span>
              Our team will manually review the claim for security (usually within 24h).
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">4.</span>
              Once approved, you'll receive access to your owner dashboard.
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
