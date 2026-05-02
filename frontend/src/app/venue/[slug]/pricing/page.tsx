'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Zap, Award, Crown } from 'lucide-react';
import { getVenueBySlug } from '@/lib/api';

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

const TIERS = [
  {
    id: 'bronze',
    name: 'Bronze',
    price: '99',
    description: 'Perfect for small local venues looking for consistent traffic.',
    icon: Award,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    features: [
      'Top 10 search placement',
      'Verified Bronze badge',
      'Basic click analytics',
      'Email support'
    ]
  },
  {
    id: 'silver',
    name: 'Silver',
    price: '199',
    description: 'Stand out from the crowd and reach more London families.',
    icon: Zap,
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    features: [
      'Top 5 search placement',
      'Prominent Silver badge',
      'Advanced traffic insights',
      'Priority email support',
      'Up to 3 photo uploads'
    ],
    popular: true
  },
  {
    id: 'gold',
    name: 'Gold',
    price: '499',
    description: 'The ultimate growth package for premium London venues.',
    icon: Crown,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    features: [
      'Top 3 search placement',
      'Featured Gold styling',
      'Real-time data dashboard',
      'Dedicated account manager',
      'Custom branding & colors',
      'Featured on homepage'
    ]
  }
];

export default function PricingPage({ params }: Props) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectTier = async (tier: string) => {
    setIsSubmitting(tier);
    setError(null);

    try {
      // 1. Get venue info
      const venueRes = await getVenueBySlug(resolvedParams.slug);
      const venue = venueRes.data.basic;

      // 2. Create checkout session
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/billing/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          venueId: venue.id, 
          tier: tier,
          interval: 'monthly' 
        }),
      });

      const data = await response.json();

      if (data.success && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to initiate checkout. Is your claim verified?');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background pb-24">
      <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur-md border-b border-outline-variant/60">
        <div className="mx-auto max-w-6xl flex items-center gap-4 px-4 py-3">
          <Link 
            href={`/venue/${resolvedParams.slug}`}
            className="p-2 rounded-full hover:bg-surface-container transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </Link>
          <h1 className="font-display text-xl font-bold text-on-background">Sponsorship Tiers</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl font-bold mb-4">Grow your presence on KidSpot</h2>
          <p className="text-on-surface-variant max-w-2xl mx-auto text-lg">
            Choose a sponsorship tier to reach more parents, build trust, and prove your venue's value to the community.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-10 p-4 bg-error-container text-error rounded-2xl text-sm font-medium border border-error/20">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            return (
              <div 
                key={tier.id}
                className={`relative flex flex-col p-8 rounded-[32px] border-2 transition-all hover:shadow-xl ${
                  tier.popular ? 'border-primary shadow-lg scale-105 z-10' : 'border-outline-variant shadow-sm'
                } bg-surface-container-lowest`}
              >
                {tier.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                    Most Popular
                  </div>
                )}

                <div className={`w-14 h-14 rounded-2xl ${tier.bgColor} ${tier.color} flex items-center justify-center mb-6`}>
                  <Icon size={32} />
                </div>

                <h3 className="font-display text-2xl font-bold mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold">£{tier.price}</span>
                  <span className="text-on-surface-variant font-medium">/month</span>
                </div>
                <p className="text-sm text-on-surface-variant mb-8 min-h-[40px]">
                  {tier.description}
                </p>

                <ul className="space-y-4 mb-10 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm font-medium">
                      <Check size={18} className="text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectTier(tier.id)}
                  disabled={isSubmitting !== null}
                  className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
                    tier.popular 
                      ? 'bg-primary text-primary-foreground hover:brightness-95 active:scale-95' 
                      : 'bg-surface-variant text-on-surface-variant hover:bg-outline-variant active:scale-95'
                  }`}
                >
                  {isSubmitting === tier.id ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    `Select ${tier.name}`
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-20 text-center">
          <p className="text-on-surface-variant text-sm">
            Secure payments processed by <strong>Stripe</strong>. <br className="sm:hidden" />
            Cancel anytime from your dashboard.
          </p>
        </div>
      </main>
    </div>
  );
}
