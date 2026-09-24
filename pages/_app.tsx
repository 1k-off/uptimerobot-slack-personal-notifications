import { ThemeProvider } from 'next-themes';
import '@/styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import type { AppProps } from 'next/app';
import type { Session } from 'next-auth';
import { Open_Sans, Unbounded } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';

const openSans = Open_Sans({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-open-sans',
  display: 'swap',
});

const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-unbounded',
  display: 'swap',
});

interface MyAppProps extends AppProps {
  pageProps: {
    session?: Session;
    [key: string]: unknown;
  };
}

function MyApp({ Component, pageProps: { session, ...pageProps } }: MyAppProps) {
  return (
    <div className={`${openSans.variable} ${unbounded.variable} font-sans`}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <SessionProvider session={session}>
          <Component {...pageProps} />
          <Toaster />
        </SessionProvider>
      </ThemeProvider>
    </div>
  );
}

export default MyApp;
