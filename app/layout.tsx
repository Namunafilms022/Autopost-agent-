import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import Link from 'next/link';

import { ThemeProvider } from '@/components/theme-provider';
import { SiteFooter } from '@/components/site-footer';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AutoPost Agent',
  description: 'Content management system',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <div className="flex flex-1 flex-col">
            {children}
          </div>
          <SiteFooter />
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
