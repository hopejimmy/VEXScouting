import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface PerformanceData {
    teamNumber: string;
    opr: string;
    winRate: string;
    skills: number;
    strength: number;
    tier: string;
}

export function useTeamPerformance(teamNumbers: string[]) {
    return useQuery<PerformanceData[]>({
        queryKey: ['teamPerformance', teamNumbers.sort().join(',')],
        queryFn: async () => {
            if (teamNumbers.length === 0) return [];

            const params = new URLSearchParams();
            params.append('teams', teamNumbers.join(','));

            const response = await fetch(`${API_BASE_URL}/api/analysis/performance?${params.toString()}`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch performance data');
            }
            return response.json();
        },
        enabled: teamNumbers.length > 0,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false // Don't retry if analysis fails (e.g. timeout)
    });
}
