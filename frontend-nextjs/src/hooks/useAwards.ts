import { useQuery } from '@tanstack/react-query';
import type { Award } from '@/types/skills';

const API_BASE = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  : 'http://localhost:3000';

async function fetchTeamAwards(teamNumber: string, eventId: number): Promise<Award[]> {
  const response = await fetch(`${API_BASE}/api/teams/${teamNumber}/events/${eventId}/awards`);
  
  if (!response.ok) {
    // Return empty array if awards not found instead of throwing error
    return [];
  }
  
  return response.json();
}

export function useTeamAwards(teamNumber: string, eventId: number) {
  return useQuery({
    queryKey: ['team-awards', teamNumber, eventId],
    queryFn: () => fetchTeamAwards(teamNumber, eventId),
    enabled: !!teamNumber && !!eventId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1, // Only retry once for awards
    refetchOnWindowFocus: false,
  });
}

export function useMultipleTeamAwards(teamNumber: string, eventIds: number[]) {
  return useQuery({
    queryKey: ['team-awards-multiple', teamNumber, eventIds],
    queryFn: async () => {
      const promises = eventIds.map(eventId => fetchTeamAwards(teamNumber, eventId));
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
    enabled: !!teamNumber && eventIds.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
} 