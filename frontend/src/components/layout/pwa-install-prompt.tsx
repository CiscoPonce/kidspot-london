'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      <div className="mx-auto max-w-lg rounded-t-[16px] bg-surface border-t border-outline-variant px-5 py-4 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-title-sm text-title-sm text-on-surface">
              Install KidSpot
            </h3>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              Add to your home screen for quick access
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-highest active:scale-95 transition"
            aria-label="Dismiss install prompt"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <div className="mt-3 flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-full border border-outline bg-surface px-4 py-2.5 font-button-label text-button-label text-on-surface-variant min-h-[44px] active:scale-95 transition"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 rounded-full bg-primary text-on-primary px-4 py-2.5 font-button-label text-button-label min-h-[44px] shadow-sm hover:brightness-95 active:scale-95 transition"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
