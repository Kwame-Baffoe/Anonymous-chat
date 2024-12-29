import { useInfiniteQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Message } from '../interfaces/Message';
import { ApiResponse } from '../types/api';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const useMessages = (roomId: string) => {
  return useInfiniteQuery({
    queryKey: ['messages', roomId],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get(
        `/messages?roomId=${roomId}&page=${pageParam}&limit=20`
      );
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: ApiResponse<Message>) => lastPage.nextPage ?? undefined,
    enabled: !!roomId,
  });
};
