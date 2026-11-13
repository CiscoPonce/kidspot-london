import type { Metadata, Viewport } from 'next';
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import { AppProviders } from '@/providers';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BottomNav } from '@/components/layout/bottom-nav';
import { FeedbackButton } from '@/components/feedback-button';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'KidSpot — Parties and activities for under-7s in London',
  description:
    'Help London parents of under-7s organise a birthday party or a weekend activity. Search by postcode, shortlist, then call the venue.',
  openGraph: {
    title: 'KidSpot — Parties and play for under-7s',
    description:
      'Find soft play, halls, parks and play centres near your London postcode. Built for parents of children under seven.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F6F4EE',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
        className={`${plusJakartaSans.variable} ${fraunces.variable} bg-brand-paper text-brand-dark font-sans antialiased flex flex-col min-h-screen`}
      >
        <AppProviders>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <BottomNav />
          <FeedbackButton />
        </AppProviders>
      </body>
    </html>
  );
}
