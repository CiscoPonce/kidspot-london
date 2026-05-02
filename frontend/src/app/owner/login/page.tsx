'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Mail, KeyRound, Loader2 } from 'lucide-react';

export default function OwnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/owner/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('otp');
      } else {
        setError(data.error || 'Failed to send login code');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/owner/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (data.success) {
        // Store token and venues (simplified)
        localStorage.setItem('owner_token', data.token);
        localStorage.setItem('owner_venues', JSON.stringify(data.venues));
        
        // Redirect to dashboard
        router.push('/owner/dashboard');
      } else {
        setError(data.error || 'Invalid login code');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col">
      <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur-md border-b border-outline-variant/60">
        <div className="mx-auto max-w-2xl flex items-center gap-4 px-4 py-3">
          <Link href="/" className="p-2 rounded-full hover:bg-surface-container transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="font-display text-xl font-bold">Owner Portal</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-4">
              <ShieldCheck size={16} />
              Secure Access
            </div>
            <h2 className="font-display text-3xl font-bold mb-3">
              {step === 'email' ? 'Welcome Back' : 'Check your email'}
            </h2>
            <p className="text-on-surface-variant">
              {step === 'email' 
                ? 'Enter your business email to access your venue dashboard.' 
                : `We've sent a 6-digit code to ${email}`}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error-container text-error rounded-2xl text-sm font-medium border border-error/20">
              {error}
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleRequestOtp} className="space-y-6">
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
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-container text-on-primary-container font-bold py-4 rounded-2xl hover:brightness-95 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Login Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <label className="block">
                <span className="text-sm font-bold text-on-surface-variant ml-1 mb-2 block">Verification Code</span>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full bg-surface border border-outline-variant rounded-2xl py-4 pl-12 pr-4 text-2xl tracking-[0.5em] font-mono text-on-surface focus:border-primary focus:ring-2 focus:ring-primary-container transition-all outline-none"
                  />
                </div>
              </label>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl hover:brightness-95 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login to Dashboard'}
              </button>
              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-sm font-bold text-outline hover:text-on-surface transition-colors"
              >
                Use a different email
              </button>
            </form>
          )}

          <div className="mt-12 pt-8 border-t border-outline-variant text-center">
            <p className="text-xs text-on-surface-variant">
              Not a verified owner yet? <br />
              <Link href="/" className="text-primary font-bold hover:underline">Find your venue to start a claim.</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
