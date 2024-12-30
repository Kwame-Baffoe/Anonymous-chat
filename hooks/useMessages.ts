import { useEffect } from 'react';
import useSWRInfinite from 'swr/infinite';
import { mutate } from 'swr';
import { Message } from '../interfaces/Message';
import { ApiResponse } from '../types/api';
import { Logger } from '../utils/Logger';

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to fetch messages');
    }
    return res.json();
  } catch (error) {
    Logger.error('Failed to fetch messages:', error);
    throw error;
  }
};

const getKey = (roomId: string) => (pageIndex: number, previousPageData: ApiResponse<Message> | null): string | null => {
  // Return null when reached the end
  if (previousPageData && !previousPageData.nextPage) return null;

  // First page, we don't have previousPageData
  if (pageIndex === 0) return `/api/messages?roomId=${roomId}&page=1&limit=20`;

  // Add the cursor to the API endpoint
  return `/api/messages?roomId=${roomId}&page=${pageIndex + 1}&limit=20`;
};

export const useMessages = (roomId: string) => {
  const {
    data,
    error,
    size,
    setSize,
    isLoading,
    isValidating
  } = useSWRInfinite<ApiResponse<Message>>(
    roomId ? getKey(roomId) : () => null,
    fetcher,
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateFirstPage: true,
      dedupingInterval: 30000, // Consider data fresh for 30 seconds
      shouldRetryOnError: true,
      errorRetryCount: 2
    }
  );

  // Clear messages cache when switching rooms
  useEffect(() => {
    if (roomId) {
      // Clear previous room's messages from cache
      mutate((key) => typeof key === 'string' && key.startsWith('/api/messages'), undefined, { revalidate: false });
    }
  }, [roomId]);

  const messages: Message[] = data ? data.flatMap((page: ApiResponse<Message>) => page.results || []) : [];
  const isLoadingMore = Boolean(isLoading || (size > 0 && data && typeof data[size - 1] === "undefined"));
  const isEmpty: boolean = !data || !data[0]?.results || data[0].results.length === 0;
  const isReachingEnd: boolean = isEmpty || !data || !data[data.length - 1]?.nextPage;

  // Provide compatibility with react-query interface
  const fetchNextPage = () => {
    setSize(size + 1);
    return Promise.resolve();
  };
  const hasNextPage: boolean = !isReachingEnd;

  return {
    data: {
      pages: data || [],
      pageParams: Array.from({ length: size }, (_, i) => i + 1)
    },
    error,
    isLoading: isLoadingMore,
    isValidating,
    size,
    setSize,
    isReachingEnd,
    // Compatibility with react-query interface
    fetchNextPage,
    hasNextPage
  };
};
