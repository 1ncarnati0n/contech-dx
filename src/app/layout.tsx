import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import NavBar from '@/components/layout/NavBar';
import NavBarWrapper from '@/components/layout/NavBarWrapper';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { Toaster } from '@/components/ui/Toaster';

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
      <body className={`${inter.variable} font-sans min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <NavBarWrapper>
            <NavBar />
          </NavBarWrapper>
          <main className="pt-16 min-h-screen bg-white dark:bg-black text-primary-950 dark:text-primary-50 transition-colors">
            {children}
          </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
