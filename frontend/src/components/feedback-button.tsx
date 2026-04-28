'use client';

import Link from 'next/link';

export function FeedbackButton() {
  return (
    <div className="hidden md:block fixed bottom-6 right-6 z-40">
      <Link
        href="https://tally.so/r/n0XOXO"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-on-background text-background px-4 py-2.5 text-sm font-semibold shadow-lg shadow-on-background/20 hover:bg-tertiary hover:text-on-tertiary transition-all active:scale-95"
      >
        <span
          className="material-symbols-outlined text-[18px]"
          aria-hidden="true"
        >
          chat_bubble
        </span>
        <span>Feedback</span>
      </Link>
    </div>
  );
}
