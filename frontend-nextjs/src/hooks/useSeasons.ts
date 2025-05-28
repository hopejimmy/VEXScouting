import { useQuery } from '@tanstack/react-query';

interface Season {
  id: number;
  name: string;
  start: string;
  end: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useSeasons() {
  return useQuery<Season[]>({
    queryKey: ['seasons'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/seasons`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch seasons');
      }
      return response.json();
    },
    staleTime: 24 * 60 * 60 * 1000, // Consider data fresh for 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // Keep in cache for 7 days
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
} 