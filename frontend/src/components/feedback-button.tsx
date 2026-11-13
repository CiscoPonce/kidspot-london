'use client';

import Link from 'next/link';

export function FeedbackButton() {
  return (
    <div className="fixed bottom-6 right-6 z-40 hidden md:block">
      <Link
        href="https://tally.so/r/n0XOXO"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-white px-4 py-2.5 text-sm font-semibold text-brand-dark shadow-sm hover:border-brand-dark/30"
      >
        Feedback
      </Link>
    </div>
  );
}
