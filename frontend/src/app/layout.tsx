import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
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

export const metadata: Metadata = {
  title: "KidSpot — Find the Perfect Place for Their Big Day",
  description:
    "The UK's most trusted directory of safety-checked kids' party venues. Discover soft play, trampoline parks, craft studios and party halls.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FFFDF5',
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
        className={`${plusJakartaSans.variable} bg-[#FFFDF5] text-brand-dark font-sans antialiased flex flex-col min-h-screen`}
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
