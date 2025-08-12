"use client";

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider
      refetchOnWindowFocus={false}
      // Keep default server polling; tune if needed:
      // refetchInterval={0} // disable periodic refetch
    >
      {children}
    </NextAuthSessionProvider>
  );
}