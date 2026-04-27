import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface PerformanceData {
    teamNumber: string;
    opr: string;
    ccwm: string;       // NEW: needed for alliance aggregate (Task 9)
    winRate: string;
    skills: number;
    strength: number;
    tier: string;
    n: number;          // NEW: event count, drives thin-data indicator (Task 8)
}

export function useTeamPerformance(teamNumbers: string[], matchType: string = 'VRC') {
    return useQuery<PerformanceData[]>({
        queryKey: ['teamPerformance', matchType, teamNumbers.sort().join(',')],
        queryFn: async () => {
            if (teamNumbers.length === 0) return [];

            const params = new URLSearchParams();
            params.append('teams', teamNumbers.join(','));
            params.append('matchType', matchType);

            const response = await fetch(`${API_BASE_URL}/api/analysis/performance?${params.toString()}`);
            if (!response.ok) {
                console.error('Failed to fetch performance data');
                return [];
            }
            return response.json();
        },
        enabled: teamNumbers.length > 0,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false
    });
}
