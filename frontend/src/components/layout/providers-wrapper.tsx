'use client';

import { ReactNode } from 'react';
import { AppProviders } from '@/providers';
import { FeedbackButton } from '@/components/feedback-button';
import { Toaster } from 'sonner';

export function ProvidersWrapper({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      {children}
      <FeedbackButton />
      <Toaster position="bottom-center" />
    </AppProviders>
  );
}
