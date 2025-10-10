import './globals.css';
import type { Metadata } from 'next';
import { Inter, Nunito_Sans } from 'next/font/google';
import { SessionProvider } from './providers/session-provider';
import { NotificationProvider } from '../contexts/notification-context';
import HeaderVisibility from '../components/header-visibility';
import GlobalNotificationPanel from '../components/GlobalNotificationPanel';
import { Toaster } from '@/components/ui/toaster';

// Import SAFE background service manager to auto-start all services
import '@/lib/safe-background-service-manager';

// Extend Window interface to include debugMode
declare global {
  interface Window {
    debugMode?: boolean;
  }
}

  
// UNCOMMENT THIS FOR REMOVING THE CONSOLE.LOG IN LIVE


const inter = Inter({ subsets: ['latin'] });
const nunitoSans = Nunito_Sans({ 
  subsets: ['latin'],
  variable: '--font-nunito-sans',
});

export const metadata: Metadata = {
  title: 'IT Help Desk - ASPAC Philippines',
  description: 'IT Support Portal for ASPAC Philippines',
  icons: {
    icon: [
      { url: '/aspac-logo.png' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/favicon.ico',
    apple: '/aspac-logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
  
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" href="/aspac-logo.png" />
        <link rel="apple-touch-icon" href="/aspac-logo.png" />
      </head>
      <body className={`${inter.className} ${nunitoSans.variable}`}>
        <SessionProvider>
          <NotificationProvider>
            <HeaderVisibility>
              {children}
            </HeaderVisibility>
            <GlobalNotificationPanel />
            <Toaster />
          </NotificationProvider>
        </SessionProvider>
      </body>
    </html>
  );
}