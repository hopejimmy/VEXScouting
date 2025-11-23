import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface MatchTeam {
    team: {
        id: number;
        name: string;
        rank: number | null;
    };
    sitting: boolean;
}

export interface MatchAlliance {
    color: 'red' | 'blue';
    score: number;
    teams: MatchTeam[];
}

export interface Match {
    id: number;
    name: string;
    round: number;
    instance: number;
    matchnum: number;
    scheduled: string;
    started: string;
    field: string;
    alliances: MatchAlliance[];
}

export function useTeamMatches(
    teamNumber: string,
    eventId: string,
    divisionId: string,
    matchType: string,
    refetchInterval: number | false = false
) {
    return useQuery<Match[]>({
        queryKey: ['teamMatches', teamNumber, eventId, divisionId, matchType],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (matchType) {
                params.append('matchType', matchType);
            }

            const response = await fetch(
                `${API_BASE_URL}/api/teams/${teamNumber}/events/${eventId}/divisions/${divisionId}/matches?${params.toString()}`
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch matches');
            }

            return response.json();
        },
        enabled: !!teamNumber && !!eventId && !!divisionId,
        refetchInterval,
        staleTime: 60 * 1000, // 1 minute
    });
}
