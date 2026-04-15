'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Match } from '@/hooks/useTeamMatches';
import { PerformanceData } from '@/hooks/useTeamPerformance';
import { MatchAnalysisCard } from '@/components/analysis/MatchAnalysisCard';

export function VrcMatchCard({
    match,
    teamNumber,
    predictionMode,
    performanceMap,
}: {
    match: Match;
    teamNumber: string;
    predictionMode: boolean;
    performanceMap: Record<string, PerformanceData>;
}) {
    const redAlliance = match.alliances.find(a => a.color === 'red');
    const blueAlliance = match.alliances.find(a => a.color === 'blue');

    const redScore = redAlliance?.score || 0;
    const blueScore = blueAlliance?.score || 0;

    let result: 'win' | 'loss' | 'tie' | null = null;
    const isRed = redAlliance?.teams.some(t => t.team.name === teamNumber);

    if (match.started) {
        if (redScore === blueScore) result = 'tie';
        else if (isRed) result = redScore > blueScore ? 'win' : 'loss';
        else result = blueScore > redScore ? 'win' : 'loss';
    }

    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-3 px-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <span className="font-bold text-gray-900">{match.name}</span>
                        <Badge variant="outline" className="bg-white">
                            {new Date(match.scheduled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Badge>
                    </div>
                    {result && (
                        <Badge className={`
              ${result === 'win' ? 'bg-green-100 text-green-700 border-green-200' : ''}
              ${result === 'loss' ? 'bg-red-100 text-red-700 border-red-200' : ''}
              ${result === 'tie' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : ''}
            `}>
                            {result.toUpperCase()}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                    <div className={`p-4 ${result && (redScore > blueScore ? 'bg-red-50/30' : '')}`}>
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-semibold text-red-600">Red Alliance</span>
                            <span className="text-2xl font-bold text-gray-900">{redScore}</span>
                        </div>
                        <div className="space-y-2">
                            {redAlliance?.teams.map((t) => (
                                <TeamRow
                                    key={t.team.id}
                                    team={t}
                                    isFocused={t.team.name === teamNumber}
                                    performanceData={performanceMap[t.team.name]}
                                    showAnalysis={predictionMode}
                                />
                            ))}
                        </div>
                    </div>
                    <div className={`p-4 ${result && (blueScore > redScore ? 'bg-blue-50/30' : '')}`}>
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-semibold text-blue-600">Blue Alliance</span>
                            <span className="text-2xl font-bold text-gray-900">{blueScore}</span>
                        </div>
                        <div className="space-y-2">
                            {blueAlliance?.teams.map((t) => (
                                <TeamRow
                                    key={t.team.id}
                                    team={t}
                                    isFocused={t.team.name === teamNumber}
                                    performanceData={performanceMap[t.team.name]}
                                    showAnalysis={predictionMode}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                {predictionMode && (
                    <MatchAnalysisCard
                        redAlliance={redAlliance?.teams.map(t => t.team.name) || []}
                        blueAlliance={blueAlliance?.teams.map(t => t.team.name) || []}
                        performanceMap={performanceMap}
                    />
                )}
            </CardContent>
        </Card>
    );
}

function TeamRow({
    team,
    isFocused,
    performanceData,
    showAnalysis,
}: {
    team: any;
    isFocused: boolean;
    performanceData?: PerformanceData;
    showAnalysis: boolean;
}) {
    return (
        <div className={`flex justify-between items-center p-2 rounded ${isFocused ? 'bg-gray-100 ring-1 ring-gray-200' : ''}`}>
            <div className="flex items-center space-x-2">
                <span className={`font-medium ${isFocused ? 'text-gray-900' : 'text-gray-600'}`}>
                    {team.team.name}
                </span>
                {team.sitting && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">Sit</Badge>
                )}
            </div>

            <div className="flex items-center space-x-2">
                {showAnalysis && (
                    <Badge variant="secondary" className="text-xs font-normal bg-gray-100 text-gray-700">
                        {performanceData ? `WR: ${performanceData.winRate}` : 'WR: N/A'}
                    </Badge>
                )}
                {team.team.rank && (
                    <Badge variant="outline" className="text-xs font-normal text-gray-500 bg-white">
                        Rank #{team.team.rank}
                    </Badge>
                )}
            </div>
        </div>
    );
}
