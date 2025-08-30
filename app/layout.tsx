import './globals.css';
import type { Metadata } from 'next';
import { Inter, Nunito_Sans } from 'next/font/google';
import { SessionProvider } from './providers/session-provider';
import HeaderVisibility from '../components/header-visibility';
import { Toaster } from '@/components/ui/toaster';

// Import SAFE background service manager to auto-start all services
import '@/lib/safe-background-service-manager';

const inter = Inter({ subsets: ['latin'] });
const nunitoSans = Nunito_Sans({ 
  subsets: ['latin'],
  variable: '--font-nunito-sans',
});

export const metadata: Metadata = {
  title: 'IT Help Desk - ASPAC Philippines',
  description: 'IT Support Portal for ASPAC Philippines',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${nunitoSans.variable}`}>
        <SessionProvider>
          <HeaderVisibility>
            {children}
          </HeaderVisibility>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}