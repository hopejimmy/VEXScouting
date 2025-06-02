import { useQuery } from '@tanstack/react-query';
import type { Program } from '@/types/skills';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function usePrograms() {
  return useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/programs`);
      if (!response.ok) {
        throw new Error('Failed to fetch programs');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,   // Keep in cache for 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
} 