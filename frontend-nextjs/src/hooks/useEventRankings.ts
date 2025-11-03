import { useQuery } from '@tanstack/react-query';
import type { EventRankingsResponse } from '@/types/skills';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useEventRankings(eventId: string, matchType: string = 'VRC') {
  return useQuery<EventRankingsResponse>({
    queryKey: ['event-rankings', eventId, matchType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (matchType) params.append('matchType', matchType);
      
      const response = await fetch(
        `${API_BASE_URL}/api/events/${eventId}/rankings?${params.toString()}`
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch event rankings');
      }
      
      return response.json();
    },
    enabled: !!eventId,
    staleTime: 10 * 60 * 1000,      // Data considered fresh for 10 minutes
    gcTime: 30 * 60 * 1000,         // Keep in cache for 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

