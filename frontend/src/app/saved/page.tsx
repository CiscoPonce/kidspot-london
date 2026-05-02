import Link from 'next/link';
import { ArrowLeft, Heart } from 'lucide-react';

export default function SavedPage() {
  return (
    <div className="min-h-screen bg-background text-on-background pb-24">
      <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur-md border-b border-outline-variant/60">
        <div className="mx-auto max-w-6xl flex items-center gap-4 px-4 sm:px-6 py-3">
          <Link 
            href="/" 
            className="p-2 rounded-full hover:bg-surface-container transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </Link>
          <h1 className="font-display text-xl font-bold">Saved Places</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-12 text-center">
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
            <Heart size={40} fill="currentColor" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">Coming Soon</h2>
            <p className="mt-2 text-on-surface-variant max-w-sm mx-auto">
              We're building a way for you to save your favorite venues. Check back soon to start your personal collection!
            </p>
          </div>
          <Link
            href="/"
            className="bg-primary-container text-on-primary-container font-semibold px-8 py-3 rounded-2xl hover:brightness-95 active:scale-95 transition-all shadow-[inset_0_-2px_0_rgba(0,0,0,0.06)]"
          >
            Discover more places
          </Link>
        </div>
      </main>
    </div>
  );
}
