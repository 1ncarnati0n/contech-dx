import type { Metadata } from 'next';
import { Suspense } from 'react';
import '../styles/globals.css';
import NavBar from '@/components/layout/NavBar';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { Toaster } from '@/components/ui/Toaster';
import LoadingBar from '@/components/ui/LoadingBar';
import { GlobalChatbot } from '@/components/global/GlobalChatbot';

export const metadata: Metadata = {
  title: 'ConTech-DX',
  description: '라온아크테크 스마트건축 플랫폼',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="font-sans min-h-screen bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <Suspense fallback={null}>
            <LoadingBar />
          </Suspense>
          <NavBar />
          <main className="pt-16 min-h-screen text-foreground">
            {children}
          </main>
          <Suspense fallback={null}>
            <GlobalChatbot />
          </Suspense>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
