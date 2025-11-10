import { useQuery } from '@tanstack/react-query';
import type { TeamEvent } from '@/types/skills';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useTeamEvents(
  teamNumber: string, 
  seasonId: string, 
  matchType?: string
) {
  return useQuery<TeamEvent[]>({
    queryKey: ['teamEvents', teamNumber, seasonId, matchType],
    queryFn: async () => {
      const params = new URLSearchParams({
        season: seasonId,
      });
      
      // Only add matchType if it's provided
      if (matchType) {
        params.append('matchType', matchType);
      }
      
      const response = await fetch(
        `${API_BASE_URL}/api/teams/${teamNumber}/events?${params.toString()}`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch team events');
      }
      return response.json();
    },
    // CRITICAL: Only fetch when we have all required data including matchType
    // This prevents race conditions where we might fetch with wrong program
    enabled: !!teamNumber && !!seasonId && !!matchType,
    staleTime: 5 * 60 * 1000,      // Data considered fresh for 5 minutes
    gcTime: 30 * 60 * 1000,        // Keep in cache for 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
} 