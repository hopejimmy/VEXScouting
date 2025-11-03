'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Trophy, TrendingUp, Users, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEventRankings } from '@/hooks/useEventRankings';
import { RankingsTable } from '@/components/event-rankings/RankingsTable';
import { Header } from '@/components/navigation/Header';

export default function EventRankingsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params.eventId as string;
  const matchType = searchParams.get('matchType') || 'VRC';
  const returnUrl = searchParams.get('returnUrl') || '/';
  const highlightTeam = searchParams.get('highlightTeam') || undefined;
  
  const [selectedGrade, setSelectedGrade] = useState<string>('All');

  const { data, isLoading, error } = useEventRankings(eventId, matchType, selectedGrade);

  const handleBack = () => {
    router.push(returnUrl);
  };

  const handleExport = () => {
    if (!data || !data.rankings) return;
    
    // Create CSV content
    const headers = ['Event Rank', 'Team Number', 'Team Name', 'Grade', 'World Rank', 'Combined Score', 'Auto Skills', 'Driver Skills', 'Organization', 'Region'];
    const rows = data.rankings.map(team => [
      team.eventRank,
      team.teamNumber,
      team.teamName,
      team.grade,
      team.worldRank,
      team.combinedScore,
      team.highestAutonomousSkills,
      team.highestDriverSkills,
      team.organization,
      team.region
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-${eventId}-rankings-${matchType}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Team Details</span>
          </Button>
        </motion.div>

        {isLoading && (
          <div className="space-y-6">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-96 w-full" />
          </div>
        )}

        {error && (
          <Card className="p-8 text-center border-red-200 bg-red-50">
            <div className="text-red-600 mb-2">⚠️ Error</div>
            <p className="text-red-700">Failed to load event rankings. Please try again.</p>
          </Card>
        )}

        {data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {/* Event Header */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    {data.eventName}
                  </h1>
                  <div className="flex items-center space-x-4 text-gray-600">
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      {data.matchType}
                    </Badge>
                    <span className="text-sm">Event ID: {data.eventId}</span>
                  </div>
                </div>
                
                {/* Grade Filter */}
                {data.gradeBreakdown && (data.gradeBreakdown['High School'] > 0 || data.gradeBreakdown['Middle School'] > 0) && (
                  <div className="flex flex-col items-end space-y-2">
                    <label className="text-sm font-medium text-gray-700">Filter by Grade:</label>
                    <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">
                          All ({data.totalTeamsInEvent})
                        </SelectItem>
                        {data.gradeBreakdown['High School'] > 0 && (
                          <SelectItem value="High School">
                            High School ({data.gradeBreakdown['High School']})
                          </SelectItem>
                        )}
                        {data.gradeBreakdown['Middle School'] > 0 && (
                          <SelectItem value="Middle School">
                            Middle School ({data.gradeBreakdown['Middle School']})
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>Total Teams</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-gray-900">{data.teamsInEvent}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center space-x-2">
                    <Trophy className="w-4 h-4" />
                    <span>With Rankings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">{data.teamsWithRankings}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Coverage</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">
                    {data.teamsInEvent > 0 
                      ? Math.round((data.teamsWithRankings / data.teamsInEvent) * 100)
                      : 0}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleExport}
                    className="w-full"
                    disabled={!data.rankings || data.rankings.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Info Message */}
            {data.teamsWithoutRankings > 0 && (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-4">
                  <p className="text-yellow-800 text-sm">
                    ℹ️ {data.teamsWithoutRankings} team(s) at this event don't have world skills rankings yet. 
                    They may not have participated in skills challenges or data hasn't been uploaded.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Rankings Table */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Event Rankings (by World Skills)
              </h2>
              <p className="text-gray-600 mb-4">
                Teams ranked by: Combined Score → Auto Skills → Driver Skills → World Rank
              </p>
              <RankingsTable rankings={data.rankings} highlightTeam={highlightTeam} />
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

