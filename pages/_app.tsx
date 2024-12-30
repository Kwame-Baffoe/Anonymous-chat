import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SocketProvider } from '../contexts/SocketContext';
import { UserProvider } from '../contexts/UserContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const queryClient = new QueryClient();

// Wrap Component with online status tracking
function AppContent({ Component, pageProps }: {
  Component: AppProps['Component'];
  pageProps: AppProps['pageProps'];
}) {
  useOnlineStatus();
  return <Component {...pageProps} />;
}

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <SocketProvider>
            <AppContent Component={Component} pageProps={pageProps} />
          </SocketProvider>
        </UserProvider>
        <ReactQueryDevtools />
      </QueryClientProvider>
    </SessionProvider>
  );
}

export default MyApp;
