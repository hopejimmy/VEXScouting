import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { PerformanceData } from '@/hooks/useTeamPerformance';

interface MatchAnalysisCardProps {
    redAlliance: string[];
    blueAlliance: string[];
    performanceMap: Record<string, PerformanceData>;
}

export function MatchAnalysisCard({ redAlliance, blueAlliance, performanceMap }: MatchAnalysisCardProps) {
    // Helper to get stats safely
    const getStats = (teams: string[]) => {
        let totalStrength = 0;
        let totalOpr = 0;
        let totalSkills = 0;
        let count = 0;

        teams.forEach(t => {
            const data = performanceMap[t];
            if (data) {
                totalStrength += data.strength;
                totalOpr += parseFloat(data.opr);
                totalSkills += data.skills;
                count++;
            }
        });

        // Use averages (or sums for OPR? OPR is additive. Skills is best of? No, in match play 2v2, 
        // usually Sum of OPR is score prediction. Strength is average quality.)
        // But for Strength Score (0-100), Average makes sense for "Alliance Quality".
        // For OPR, Sum makes sense.

        return {
            strength: count > 0 ? Math.round(totalStrength / count) : 0,
            opr: totalOpr.toFixed(1),
            skills: count > 0 ? Math.round(totalSkills / count) : 0 // Avg skills for comparison
        };
    };

    const redStats = getStats(redAlliance);
    const blueStats = getStats(blueAlliance);

    const totalStrength = redStats.strength + blueStats.strength;
    const redWinProb = totalStrength > 0 ? (redStats.strength / totalStrength) * 100 : 50;
    const blueWinProb = 100 - redWinProb;

    let prediction = "Toss Up";
    if (redWinProb > 60) prediction = "Red Favored";
    if (redWinProb > 75) prediction = "Red Dominant";
    if (blueWinProb > 60) prediction = "Blue Favored";
    if (blueWinProb > 75) prediction = "Blue Dominant";

    return (
        <Card className="mt-2 border-dashed border-gray-200 bg-gray-50/50">
            <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-semibold text-gray-500">MATCH PREDICTION</span>
                    <Badge variant={prediction.includes("Red") ? "destructive" : prediction.includes("Blue") ? "default" : "secondary"}>
                        {prediction} {Math.max(redWinProb, blueWinProb).toFixed(0)}%
                    </Badge>
                </div>

                {/* Win Probability Bar */}
                <div className="relative h-4 w-full bg-blue-100 rounded-full overflow-hidden mb-4 flex">
                    <div
                        className="h-full bg-red-500 transition-all duration-1000"
                        style={{ width: `${redWinProb}%` }}
                    />
                    {/* Blue is automatic background */}
                </div>
                <div className="flex justify-between text-xs font-bold mb-4">
                    <span className="text-red-600">{redWinProb.toFixed(0)}%</span>
                    <span className="text-blue-600">{blueWinProb.toFixed(0)}%</span>
                </div>

                {/* Detailed Stats */}
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    {/* Red Stats */}
                    <div className="space-y-2">
                        <div className="text-red-700 font-bold">{redStats.strength}</div>
                        <div className="text-gray-600">{redStats.opr}</div>
                        <div className="text-gray-600">{redStats.skills}</div>
                    </div>

                    {/* Labels */}
                    <div className="space-y-2 text-gray-400 font-medium">
                        <div>STRENGTH</div>
                        <div>OPR (Sum)</div>
                        <div>SKILLS (Avg)</div>
                    </div>

                    {/* Blue Stats */}
                    <div className="space-y-2">
                        <div className="text-blue-700 font-bold">{blueStats.strength}</div>
                        <div className="text-gray-600">{blueStats.opr}</div>
                        <div className="text-gray-600">{blueStats.skills}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
