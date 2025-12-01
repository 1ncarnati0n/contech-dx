import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import '../styles/globals.css';
import NavBar from '@/components/layout/NavBar';
import NavBarWrapper from '@/components/layout/NavBarWrapper';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { Toaster } from '@/components/ui/Toaster';
import LoadingBar from '@/components/ui/LoadingBar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'ConTech-DX',
  description: '라온아크테크 건축공정관리 시스템빌드',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${inter.variable} font-sans min-h-screen bg-background text-foreground transition-colors`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
<<<<<<< HEAD
          <NavBarWrapper>
            <NavBar />
          </NavBarWrapper>
          <main className="min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
=======
          <Suspense fallback={null}>
            <LoadingBar />
          </Suspense>
          <NavBar />
          <main className="pt-16 min-h-screen bg-background text-foreground transition-colors">
>>>>>>> staging
            {children}
          </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
