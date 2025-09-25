"use client";

import { useSession } from 'next-auth/react';
import { useIdleTimer } from '@/hooks/use-idle-timer';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SessionWrapperProps {
  children: React.ReactNode;
}

export function SessionWrapper({ children }: SessionWrapperProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Handle idle timeout (1 minute = 60000ms)
  const handleIdle = () => {
    setShowIdleWarning(true);
    setCountdown(30);
  };

  const { resetTimer } = useIdleTimer({
    timeout: 900000, // 1 minute
    onIdle: handleIdle,
    enabled: !!session,
  });

  // Countdown timer for idle warning
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (showIdleWarning && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (showIdleWarning && countdown === 0) {
      handleSignOut();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showIdleWarning, countdown]);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    // Manually redirect to clean login URL
    window.location.href = '/login';
  };

  const handleStayLoggedIn = () => {
    setShowIdleWarning(false);
    setCountdown(30);
    resetTimer();
  };

  // Handle session expiration more gracefully
  useEffect(() => {
    if (status === 'unauthenticated') {
      // Let NextAuth middleware handle the redirect to avoid double redirects
      // Only manually redirect if we're not already on a public page
      const currentPath = window.location.pathname;
      const publicPaths = ['/login', '/signup', '/forgot-password'];
      const isOnPublicPage = publicPaths.some(path => currentPath.startsWith(path));
      
      if (!isOnPublicPage) {
        // Clear any existing timers and warnings
        setShowIdleWarning(false);
        // Use window.location for a clean redirect instead of router.push
        window.location.href = '/login';
      }
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <>
      {children}
      
      {/* Idle Warning Dialog */}
      <Dialog open={showIdleWarning} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Session Timeout Warning</DialogTitle>
            <DialogDescription>
              You've been inactive for a while. Your session will expire in {countdown} seconds.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
            <Button onClick={handleStayLoggedIn}>
              Stay Logged In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}