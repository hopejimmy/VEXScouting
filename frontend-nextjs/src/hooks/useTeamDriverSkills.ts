import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface TeamDriverSkills {
  teamNumber: string;
  highestDriverSkills: number;
  rank: number;
}

/**
 * Batch-fetch season-best Driver Skills score and rank for a list of teams,
 * scoped by matchType. Used by the VEXIQ match-up page.
 *
 * Missing teams (not in skills_standings) are simply absent from the returned
 * array. Callers should fall back to a placeholder when a teamNumber is missing.
 *
 * Only fires when matchType === 'VEXIQ' and there is at least one team number,
 * so the VRC/VEXU rendering path never triggers this request.
 */
export function useTeamDriverSkills(teamNumbers: string[], matchType: string | undefined) {
  const sortedKey = [...teamNumbers].sort().join(',');
  return useQuery<TeamDriverSkills[]>({
    queryKey: ['teamDriverSkills', matchType, sortedKey],
    queryFn: async () => {
      if (teamNumbers.length === 0 || !matchType) return [];
      const params = new URLSearchParams({
        teams: teamNumbers.join(','),
        matchType,
      });
      const response = await fetch(`${API_BASE_URL}/api/teams/skills-batch?${params.toString()}`);
      if (!response.ok) {
        console.error('Failed to fetch driver skills batch');
        return [];
      }
      return response.json();
    },
    enabled: teamNumbers.length > 0 && matchType === 'VEXIQ',
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
