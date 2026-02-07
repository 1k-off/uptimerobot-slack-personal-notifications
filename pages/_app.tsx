import { ThemeProvider } from 'next-themes';
import '@/styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import type { AppProps } from 'next/app';
import type { Session } from 'next-auth';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

interface MyAppProps extends AppProps {
  pageProps: {
    session?: Session;
    [key: string]: unknown;
  };
}

function MyApp({ Component, pageProps: { session, ...pageProps } }: MyAppProps) {
  return (
    <div className={`${inter.variable} font-sans`}>
      <ThemeProvider attribute="class">
        <SessionProvider session={session}>
          <Component {...pageProps} />
          <Toaster />
        </SessionProvider>
      </ThemeProvider>
    </div>
  );
}

export default MyApp;
