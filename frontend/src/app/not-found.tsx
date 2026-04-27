'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-pure-white text-absolute-black p-6 text-center">
      <h1 className="text-6xl font-black tracking-tighter mb-4 text-primary">404</h1>
      <h2 className="text-2xl font-black mb-6">Discovery Limit Reached</h2>
      <p className="text-text-muted font-bold max-w-md mb-8 uppercase text-xs tracking-widest">
        The venue or page you are looking for has been moved or deactivated.
      </p>
      <Link 
        href="/" 
        className="px-8 py-4 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
      >
        Return to Home
      </Link>
    </div>
  );
}
