import { useQuery } from '@tanstack/react-query';
import type { Team } from '@/types/skills';

export function useTeam(teamNumber: string) {
  return useQuery<Team>({
    queryKey: ['team', teamNumber],
    queryFn: async () => {
      const response = await fetch(`http://localhost:3000/api/teams/${encodeURIComponent(teamNumber)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch team details');
      }
      return response.json();
    },
    enabled: !!teamNumber,
    staleTime: 5 * 60 * 1000,      // Data considered fresh for 5 minutes
    gcTime: 30 * 60 * 1000,        // Keep in cache for 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
} 