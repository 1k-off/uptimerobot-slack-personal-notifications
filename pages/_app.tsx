import { ThemeProvider } from 'next-themes';
import '@/styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import type { AppProps } from 'next/app';
import type { Session } from 'next-auth';

interface MyAppProps extends AppProps {
  pageProps: {
    session?: Session;
    [key: string]: unknown;
  };
}

function MyApp({ Component, pageProps: { session, ...pageProps } }: MyAppProps) {
  return (
    <ThemeProvider attribute="class">
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>
    </ThemeProvider>
  );
}

export default MyApp;
