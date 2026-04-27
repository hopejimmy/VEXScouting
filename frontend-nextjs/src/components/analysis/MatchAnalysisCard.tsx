import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PerformanceData } from '@/hooks/useTeamPerformance';

interface MatchAnalysisCardProps {
    redAlliance: string[];
    blueAlliance: string[];
    performanceMap: Record<string, PerformanceData>;
}

/**
 * Alliance-level aggregate for the v2 prediction view.
 *
 * Sitting teams are filtered at the call site (see VrcMatchCard) — they
 * don't appear in the redAlliance/blueAlliance arrays this component
 * receives, so they don't influence the averages or the win probability.
 *
 * The win-probability formula `red.strength / (red.strength + blue.strength)`
 * is naive (treats Strength as ratio-scale) but unchanged in this work.
 * A logistic mapping of strength differential would be more honest but
 * needs calibration data — out of scope here.
 */
export function MatchAnalysisCard({ redAlliance, blueAlliance, performanceMap }: MatchAnalysisCardProps) {
    // Teams without performance data (no team_event_stats rows in the
    // current season) count as zero. Skipping them — the previous behavior
    // — silently averaged over a smaller denominator and could flip the
    // prediction direction when a missing-data team was on the same
    // alliance as one with data. Treating no-data as zero is harsh but
    // honest: missing data correlates strongly with low-activity teams,
    // and a self-correcting once they get processed.
    const missingCount = (teams: string[]) =>
        teams.filter(t => !performanceMap[t]).length;

    const getStats = (teams: string[]) => {
        let totalStrength = 0;
        let totalCcwm = 0;
        let totalSkills = 0;

        teams.forEach(t => {
            const data = performanceMap[t];
            totalStrength += data?.strength ?? 0;
            totalCcwm += parseFloat(data?.ccwm ?? '0');
            totalSkills += data?.skills ?? 0;
        });

        const denom = teams.length || 1;
        return {
            strength: Math.round(totalStrength / denom),
            ccwm: (totalCcwm / denom).toFixed(1),
            skills: Math.round(totalSkills / denom),
        };
    };

    const redMissing = missingCount(redAlliance);
    const blueMissing = missingCount(blueAlliance);

    const redStats = getStats(redAlliance);
    const blueStats = getStats(blueAlliance);

    const totalStrength = redStats.strength + blueStats.strength;
    const redWinProb = totalStrength > 0 ? (redStats.strength / totalStrength) * 100 : 50;
    const blueWinProb = 100 - redWinProb;

    let prediction = 'Toss Up';
    if (redWinProb > 60) prediction = 'Red Favored';
    if (redWinProb > 75) prediction = 'Red Dominant';
    if (blueWinProb > 60) prediction = 'Blue Favored';
    if (blueWinProb > 75) prediction = 'Blue Dominant';

    return (
        <Card className="mt-2 border-dashed border-gray-200 bg-gray-50/50">
            <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-semibold text-gray-500">MATCH PREDICTION</span>
                    <Badge variant={prediction.includes('Red') ? 'destructive' : prediction.includes('Blue') ? 'default' : 'secondary'}>
                        {prediction} {Math.max(redWinProb, blueWinProb).toFixed(0)}%
                    </Badge>
                </div>

                <div className="relative h-4 w-full bg-blue-100 rounded-full overflow-hidden mb-4 flex">
                    <div
                        className="h-full bg-red-500 transition-all duration-1000"
                        style={{ width: `${redWinProb}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs font-bold mb-4">
                    <span className="text-red-600">{redWinProb.toFixed(0)}%</span>
                    <span className="text-blue-600">{blueWinProb.toFixed(0)}%</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="space-y-2">
                        <div className="text-red-700 font-bold">{redStats.strength}</div>
                        <div className="text-gray-600">{redStats.ccwm}</div>
                        <div className="text-gray-600">{redStats.skills}</div>
                    </div>
                    <div className="space-y-2 text-gray-400 font-medium">
                        <div>STRENGTH</div>
                        <div>CCWM (Avg)</div>
                        <div>SKILLS (Avg)</div>
                    </div>
                    <div className="space-y-2">
                        <div className="text-blue-700 font-bold">{blueStats.strength}</div>
                        <div className="text-gray-600">{blueStats.ccwm}</div>
                        <div className="text-gray-600">{blueStats.skills}</div>
                    </div>
                </div>

                {(redMissing > 0 || blueMissing > 0) && (
                    <div className="mt-3 text-xs text-amber-600 text-center">
                        ⚠ {redMissing > 0 && `${redMissing} red team(s) without data`}
                        {redMissing > 0 && blueMissing > 0 && ' • '}
                        {blueMissing > 0 && `${blueMissing} blue team(s) without data`}
                        {' '}— counted as zero strength.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
