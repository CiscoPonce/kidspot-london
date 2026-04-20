'use client';

import Link from 'next/link';

export function FeedbackButton() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Link
        href="https://tally.so/r/n0XOXO" // Placeholder Tally.so link for KidSpot feedback
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-primary-700 hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
        <span>Feedback</span>
      </Link>
    </div>
  );
}
