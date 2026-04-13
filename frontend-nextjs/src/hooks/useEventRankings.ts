import { useQuery } from '@tanstack/react-query';
import type { EventRankingsResponse } from '@/types/skills';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useEventRankings(
  eventId: string,
  matchType: string = 'VRC',
  grade?: string,
  divisionId?: string
) {
  return useQuery<EventRankingsResponse>({
    queryKey: ['event-rankings', eventId, matchType, grade, divisionId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (matchType) params.append('matchType', matchType);
      if (grade && grade !== 'All') params.append('grade', grade);
      if (divisionId) params.append('divisionId', divisionId);

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
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
