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

    await deferredPrompt.prompt();
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
    <div className="fixed bottom-16 left-0 right-0 z-50 px-3 animate-slide-up md:bottom-4">
      <div className="mx-auto max-w-lg rounded-2xl border border-brand-border bg-white px-5 py-4 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-display text-base font-semibold text-brand-dark">
              Install KidSpot
            </h3>
            <p className="mt-1 text-xs text-brand-muted">
              Add to your home screen for quick access
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-full text-brand-muted hover:bg-brand-paper active:scale-95 transition"
            aria-label="Dismiss install prompt"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <div className="mt-3 flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 min-h-[44px] rounded-full border border-brand-border bg-white px-4 py-2.5 text-xs font-semibold text-brand-dark hover:border-brand-dark/40 active:scale-95 transition"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 min-h-[44px] rounded-full bg-brand-yellow px-4 py-2.5 text-xs font-semibold text-brand-dark shadow-sm hover:bg-brand-yellow-hover active:scale-95 transition"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
