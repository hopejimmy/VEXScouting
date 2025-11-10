import { useQuery } from '@tanstack/react-query';
import type { Award } from '@/types/skills';

const API_BASE = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  : 'http://localhost:3000';

async function fetchTeamAwards(
  teamNumber: string, 
  eventId: number, 
  matchType?: string
): Promise<Award[]> {
  const params = new URLSearchParams();
  
  // Only add matchType if it's provided
  if (matchType) {
    params.append('matchType', matchType);
  }
  
  const queryString = params.toString();
  const url = `${API_BASE}/api/teams/${teamNumber}/events/${eventId}/awards${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    // Return empty array if awards not found instead of throwing error
    return [];
  }
  
  return response.json();
}

export function useTeamAwards(
  teamNumber: string, 
  eventId: number, 
  matchType?: string
) {
  return useQuery({
    queryKey: ['team-awards', teamNumber, eventId, matchType],
    queryFn: () => fetchTeamAwards(teamNumber, eventId, matchType),
    // CRITICAL: Only fetch when we have all required data including matchType
    // This prevents race conditions where we might fetch with wrong program
    enabled: !!teamNumber && !!eventId && !!matchType,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1, // Only retry once for awards
    refetchOnWindowFocus: false,
  });
}

export function useMultipleTeamAwards(
  teamNumber: string, 
  eventIds: number[], 
  matchType?: string
) {
  return useQuery({
    queryKey: ['team-awards-multiple', teamNumber, eventIds, matchType],
    queryFn: async () => {
      const promises = eventIds.map(eventId => 
        fetchTeamAwards(teamNumber, eventId, matchType)
      );
      const results = await Promise.allSettled(promises);
      
      // Map results to event IDs, filtering out failed requests
      const awardsMap: Record<number, Award[]> = {};
      results.forEach((result, index) => {
        const eventId = eventIds[index];
        if (result.status === 'fulfilled') {
          awardsMap[eventId] = result.value;
        } else {
          awardsMap[eventId] = [];
        }
      });
      
      return awardsMap;
    },
    // CRITICAL: Only fetch when we have all required data including matchType
    // This prevents race conditions where we might fetch with wrong program
    enabled: !!teamNumber && eventIds.length > 0 && !!matchType,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
} 