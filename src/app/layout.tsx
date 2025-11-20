import type { Metadata } from 'next';
import '../styles/globals.css';
import NavBar from '@/components/layout/NavBar';
import { ThemeProvider } from '@/components/layout/ThemeProvider'; // Import ThemeProvider

export const metadata: Metadata = {
  title: 'ConTech-DX',
  description: '라온아크테크 건축직영공사 공정관리 시스템빌드',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning> {/* Add suppressHydrationWarning */}
      <body className="min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        > {/* Wrap with ThemeProvider */}
          <NavBar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
