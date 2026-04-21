'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Trophy, Calendar, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeamMatches } from '@/hooks/useTeamMatches';
import { useTeamPerformance, PerformanceData } from '@/hooks/useTeamPerformance';
import { useMemo } from 'react';
import { VrcMatchCard } from '@/components/team/VrcMatchCard';
import { useTeamDriverSkills, TeamDriverSkills } from '@/hooks/useTeamDriverSkills';
import { VexiqMatchCard } from '@/components/team/VexiqMatchCard';
import { Footer } from '@/components/navigation/Footer';

export default function MatchListPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();

    const teamNumber = params.teamNumber as string;
    const eventId = params.eventId as string;

    // Get query params passed from the previous page
    const divisionId = searchParams.get('divisionId') || '';
    const divisionName = searchParams.get('divisionName') || '';
    const matchType = searchParams.get('matchType') || 'VRC';
    const eventName = searchParams.get('eventName') || 'Event Matches';
    const eventStart = searchParams.get('start') || '';
    const eventEnd = searchParams.get('end') || '';

    const [mounted, setMounted] = useState(false);
    const [isOngoing, setIsOngoing] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Check if event is ongoing
        if (eventStart && eventEnd) {
            const now = new Date();
            const start = new Date(eventStart);
            const end = new Date(eventEnd);
            // Set end date to end of day
            end.setHours(23, 59, 59, 999);

            setIsOngoing(now >= start && now <= end);
        }
    }, [eventStart, eventEnd]);

    // Poll every 60 seconds if event is ongoing
    const refetchInterval = isOngoing ? 60000 : false;

    const {
        data: matches,
        isLoading,
        isError,
        error,
        refetch,
        isRefetching
    } = useTeamMatches(teamNumber, eventId, divisionId, matchType, refetchInterval);

    const [predictionMode, setPredictionMode] = useState(false);

    const isVexiq = matchType === 'VEXIQ';

    // Collect all unique teams for batch fetching analysis
    const allTeamNumbers = useMemo(() => {
        if (!matches) return [];
        const set = new Set<string>();
        matches.forEach(m => {
            m.alliances.forEach(a => a.teams.forEach(t => set.add(t.team.name)));
        });
        return Array.from(set);
    }, [matches]);

    // VRC/VEXU: fetch match-analysis performance for the Predict Matches feature.
    // Disable entirely on the VEXIQ path since that card doesn't use it.
    const { data: performanceList } = useTeamPerformance(isVexiq ? [] : allTeamNumbers);

    const performanceMap = useMemo(() => {
        const map: Record<string, PerformanceData> = {};
        if (performanceList) {
            performanceList.forEach(d => map[d.teamNumber] = d);
        }
        return map;
    }, [performanceList]);

    // VEXIQ: fetch season-best Driver Skills + rank for the cooperative match-up card.
    // The hook is internally gated on matchType === 'VEXIQ', so this is a no-op elsewhere.
    const { data: driverSkillsList } = useTeamDriverSkills(allTeamNumbers, matchType);

    const skillsMap = useMemo(() => {
        const map: Record<string, TeamDriverSkills> = {};
        driverSkillsList?.forEach(d => { map[d.teamNumber] = d; });
        return map;
    }, [driverSkillsList]);

    const handlePredictionToggle = () => {
        if (predictionMode) {
            setPredictionMode(false);
            return;
        }

        // Check availability
        // If performanceList is empty or very few teams found compared to total?
        // Let's check if map has at least one entry? Or verify specifically?
        // If pre-process hasn't run, DB returns empty array.
        if (!performanceList || performanceList.length === 0) {
            alert("Data not available. Please ask an admin to pre-process this event.");
            return;
        }

        setPredictionMode(true);
    };

    const handleBackClick = () => {
        router.back();
    };

    const handleFallbackClick = () => {
        // Navigate to event rankings with return URL set to Team Details page
        // The button on Rankings page says "Back to Team Details", so we route there.
        const returnUrl = `/team/${teamNumber}`;

        const params = new URLSearchParams({
            matchType,
            eventName,
            returnUrl,
            highlightTeam: teamNumber,
        });
        if (divisionId) params.append('divisionId', divisionId);
        if (divisionName) params.append('divisionName', divisionName);
        router.push(`/event-rankings/${eventId}?${params.toString()}`);
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                <Trophy className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                VEX Scouting
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Navigation & Header */}
                <div className="mb-8">
                    <Button
                        variant="ghost"
                        onClick={handleBackClick}
                        className="mb-4 flex items-center space-x-2 text-gray-600 hover:text-gray-900 pl-0"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Team Details</span>
                    </Button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{eventName}</h1>
                            <div className="flex items-center text-gray-600 space-x-4">
                                <div className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    <span>Match Schedule for Team {teamNumber}</span>
                                </div>
                                {isOngoing && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 animate-pulse">
                                        ● Live Event
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            {!isVexiq && (
                                <Button
                                    variant={predictionMode ? "default" : "outline"}
                                    onClick={handlePredictionToggle}
                                    className={`flex items-center space-x-2 ${predictionMode ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                                >
                                    <Trophy className="w-4 h-4" />
                                    <span>{predictionMode ? 'Hide Analysis' : 'Predict Matches'}</span>
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => refetch()}
                                disabled={isRefetching || isLoading}
                                className="flex items-center space-x-2"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
                                <span>Refresh</span>
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={handleFallbackClick}
                                className="flex items-center space-x-2"
                            >
                                <ExternalLink className="w-4 h-4" />
                                <span>View Event Rankings</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <Card key={i} className="overflow-hidden">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <Skeleton className="h-6 w-24" />
                                        <Skeleton className="h-6 w-32" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <Skeleton className="h-8 w-full" />
                                            <Skeleton className="h-8 w-full" />
                                        </div>
                                        <div className="space-y-2">
                                            <Skeleton className="h-8 w-full" />
                                            <Skeleton className="h-8 w-full" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : isError ? (
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="p-8 text-center">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Matches</h3>
                            <p className="text-red-700 mb-4">{error?.message || 'An error occurred'}</p>
                            <Button onClick={() => refetch()} variant="outline" className="bg-white">
                                Try Again
                            </Button>
                        </CardContent>
                    </Card>
                ) : !matches || matches.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="p-12 text-center">
                            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Match Schedule Not Available</h3>
                            <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                The match schedule for this event has not been generated yet or is not available.
                                You can view the event rankings to see all participating teams.
                            </p>
                            <Button onClick={handleFallbackClick} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                                View Event Rankings
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                    >
                        {matches.map((match) =>
                            isVexiq ? (
                                <VexiqMatchCard
                                    key={match.id}
                                    match={match}
                                    teamNumber={teamNumber}
                                    skillsMap={skillsMap}
                                />
                            ) : (
                                <VrcMatchCard
                                    key={match.id}
                                    match={match}
                                    teamNumber={teamNumber}
                                    predictionMode={predictionMode}
                                    performanceMap={performanceMap}
                                />
                            )
                        )}
                    </motion.div>
                )}
            </main>
            <Footer />
        </div>
    );
}
