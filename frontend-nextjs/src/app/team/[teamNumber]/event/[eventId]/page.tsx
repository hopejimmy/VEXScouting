'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Trophy, Calendar, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeamMatches, Match } from '@/hooks/useTeamMatches';
import { Footer } from '@/components/navigation/Footer';

export default function MatchListPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();

    const teamNumber = params.teamNumber as string;
    const eventId = params.eventId as string;

    // Get query params passed from the previous page
    const divisionId = searchParams.get('divisionId') || '';
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
        error,
        refetch,
        isRefetching
    } = useTeamMatches(teamNumber, eventId, divisionId, matchType, refetchInterval);

    const handleBackClick = () => {
        router.back();
    };

    const handleFallbackClick = () => {
        // Navigate to original event rankings page with return URL set to THIS page
        // This allows the user to come back to the match list if they want
        const currentPath = `/team/${teamNumber}/event/${eventId}`;
        const returnUrl = `${currentPath}?divisionId=${divisionId}&matchType=${matchType}&eventName=${encodeURIComponent(eventName)}&start=${eventStart}&end=${eventEnd}`;

        router.push(`/event-rankings/${eventId}?matchType=${matchType}&eventName=${encodeURIComponent(eventName)}&returnUrl=${encodeURIComponent(returnUrl)}`);
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
                ) : error ? (
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="p-8 text-center">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Matches</h3>
                            <p className="text-red-700 mb-4">{(error as Error).message}</p>
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
                        {matches.map((match) => (
                            <MatchCard
                                key={match.id}
                                match={match}
                                teamNumber={teamNumber}
                            />
                        ))}
                    </motion.div>
                )}
            </main>
            <Footer />
        </div>
    );
}

function MatchCard({ match, teamNumber }: { match: Match, teamNumber: string }) {
    const redAlliance = match.alliances.find(a => a.color === 'red');
    const blueAlliance = match.alliances.find(a => a.color === 'blue');

    const redScore = redAlliance?.score || 0;
    const blueScore = blueAlliance?.score || 0;

    // Determine result for the focused team
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
                    {/* Red Alliance */}
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
                                />
                            ))}
                        </div>
                    </div>

                    {/* Blue Alliance */}
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
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function TeamRow({ team, isFocused }: { team: any, isFocused: boolean }) {
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
            {team.team.rank && (
                <Badge variant="outline" className="text-xs font-normal text-gray-500 bg-white">
                    Rank #{team.team.rank}
                </Badge>
            )}
        </div>
    );
}
