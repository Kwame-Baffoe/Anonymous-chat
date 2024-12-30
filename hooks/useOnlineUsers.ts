import useSWR from 'swr';
import { User } from '../interfaces/User';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch online users');
  return res.json();
};

export const useOnlineUsers = () => {
  const { data, error, isLoading, isValidating } = useSWR<User[]>(
    '/api/users/online',
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  );

  return {
    data,
    error,
    isLoading,
    isValidating
  };
};
