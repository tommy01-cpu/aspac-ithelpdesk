import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SessionProvider } from './providers/session-provider';
import HeaderVisibility from '../components/header-visibility';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

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
      <body className={inter.className}>
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