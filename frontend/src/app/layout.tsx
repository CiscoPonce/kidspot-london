import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { AppProviders } from '@/providers';
import { FeedbackButton } from '@/components/feedback-button';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
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
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} bg-background text-on-background font-sans antialiased`}
      >
        <AppProviders>
          {children}
          <FeedbackButton />
        </AppProviders>
      </body>
    </html>
  );
}
