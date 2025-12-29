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
                // If 404 or other error, return empty list gracefully?
                // The backend returns 500 if error.
                // Let's just return empty array if it fails, so we don't crash UI.
                console.error("Failed to fetch performance data");
                return [];
            }
            return response.json();
        },
        enabled: teamNumbers.length > 0,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false
    });
}
