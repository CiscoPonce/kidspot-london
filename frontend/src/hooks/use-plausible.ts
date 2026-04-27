'use client';

/**
 * Mock Plausible hook to avoid build errors while Plausible is disabled/incompatible
 */
export function usePlausible() {
  return (eventName: string, options?: any) => {
    console.log(`[Plausible Mock] Event: ${eventName}`, options);
  };
}
