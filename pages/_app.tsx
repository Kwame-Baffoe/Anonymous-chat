// pages/_app.tsx

import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { SocketProvider } from '../contexts/SocketContext';
import { UserProvider } from '../contexts/UserContext';

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <UserProvider>
        <SocketProvider>
          <Component {...pageProps} />
        </SocketProvider>
      </UserProvider>
    </SessionProvider>
  );
}

export default MyApp;
