import { useQuery } from '@tanstack/react-query';

interface Season {
  id: number;
  name: string;
  start: string;
  end: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Fetch seasons for a specific program (VRC, VEXIQ, VEXU)
 * Returns seasons sorted by most recent first
 * The first season in the array is the current season for that program
 * 
 * @param matchType - The match type (VRC, VEXIQ, VEXU) - if not provided, defaults to VRC
 */
export function useSeasons(matchType?: string) {
  return useQuery<Season[]>({
    queryKey: ['seasons', matchType],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Add matchType if provided to get program-specific seasons
      if (matchType) {
        params.append('matchType', matchType);
      }
      
      const queryString = params.toString();
      const url = `${API_BASE_URL}/api/seasons${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch seasons');
      }
      return response.json();
    },
    // Only fetch when matchType is available (prevents fetching wrong program's seasons)
    enabled: !!matchType,
    staleTime: 24 * 60 * 60 * 1000, // Consider data fresh for 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // Keep in cache for 7 days
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
} 