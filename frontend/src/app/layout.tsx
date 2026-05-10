import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { AppProviders } from '@/providers';
import { FeedbackButton } from '@/components/feedback-button';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'KidSpot London — Find brilliant places for kids',
  description:
    'Discover soft play, parks, museums, libraries and party venues for kids across London. Curated, safety-checked, and easy to search.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fff9e6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Material Symbols Outlined — loaded as a real <link> rather than a CSS
          @import because Next 16 / Turbopack drops remote @import URLs from the
          bundled stylesheet, which left every icon rendering as its raw
          ligature text (e.g. "location_on", "apps", "arrow_forward").
        */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body
        className={`${plusJakartaSans.variable} bg-background text-on-background font-sans antialiased`}
      >
        <AppProviders>
          {children}
          <FeedbackButton />
        </AppProviders>
      </body>
    </html>
  );
}
