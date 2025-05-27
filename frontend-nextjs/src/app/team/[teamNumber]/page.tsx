'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Trophy, Users, MapPin, Building, Award, Heart, GitCompare } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useCompare } from '@/contexts/CompareContext';
import { getTeamGradient } from '@/utils/gradients';
import type { Team } from '@/types/skills';

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamNumber = params.teamNumber as string;
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const { data: team, isLoading, error } = useQuery<Team>({
    queryKey: ['team', teamNumber],
    queryFn: async () => {
      const response = await fetch(`http://localhost:3000/api/teams/${encodeURIComponent(teamNumber)}`);
      if (!response.ok) throw new Error('Failed to fetch team details');
      return response.json();
    },
    enabled: !!teamNumber && mounted,
  });

  const handleBackClick = () => {
    const returnUrl = searchParams.get('returnUrl');
    if (returnUrl && returnUrl.startsWith('/')) {
      // Create a new URLSearchParams to preserve the search query
      const returnSearchParams = new URLSearchParams(returnUrl.split('?')[1] || '');
      const query = returnSearchParams.get('q');
      if (query) {
        router.push(`/?q=${encodeURIComponent(query)}`);
      } else {
        router.push('/');
      }
    } else {
      router.push('/');
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen">
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
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="h-12 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-8"></div>
          </div>
        </main>
      </div>
    );
  }

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

      {/* Main Content */}
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
            onClick={handleBackClick}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Search</span>
          </Button>
        </motion.div>

        {isLoading && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-[300px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-8 w-3/4" />
                </Card>
              ))}
            </div>
          </div>
        )}

        {error && (
          <Card className="p-8 text-center border-red-200 bg-red-50">
            <div className="text-red-600 mb-2">⚠️ Error</div>
            <p className="text-red-700">Failed to fetch team details. Please try again.</p>
          </Card>
        )}

        {team && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {/* Team Header */}
            <div className="flex items-center space-x-6">
              <div className="relative h-20 w-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">
                  {team.teamNumber.slice(-2)}
                </span>
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  Team {team.teamNumber}
                </h1>
                <p className="text-xl text-gray-600 mb-2">{team.teamName}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Building className="w-4 h-4" />
                    <span>{team.organization}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{team.eventRegion}, {team.country}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-lg px-4 py-2">
                  Rank #{team.rank}
                </Badge>
                <TeamActions team={team} />
              </div>
            </div>

            {/* Skills Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                <Award className="w-6 h-6" />
                <span>Skills Performance</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardHeader className="text-center">
                    <CardTitle className="text-blue-700">Autonomous Skills</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-4xl font-bold text-blue-900 mb-2">
                      {team.autonomousSkills}
                    </div>
                    <p className="text-sm text-blue-600">Points</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardHeader className="text-center">
                    <CardTitle className="text-purple-700">Driver Skills</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-4xl font-bold text-purple-900 mb-2">
                      {team.driverSkills}
                    </div>
                    <p className="text-sm text-purple-600">Points</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardHeader className="text-center">
                    <CardTitle className="text-green-700">Total Score</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-4xl font-bold text-green-900 mb-2">
                      {team.score}
                    </div>
                    <p className="text-sm text-green-600">Combined Points</p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Team Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                <Users className="w-6 h-6" />
                <span>Team Information</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Building className="w-5 h-5" />
                      <span>Organization</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-medium">{team.organization}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MapPin className="w-5 h-5" />
                      <span>Location</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-medium">{team.eventRegion}, {team.country}</p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function TeamActions({ team }: { team: Team }) {
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { addToCompare, removeFromCompare, isInCompare, canAddToCompare } = useCompare();

  const handleFavoriteClick = () => {
    if (isFavorite(team.teamNumber)) {
      removeFromFavorites(team.teamNumber);
    } else {
      addToFavorites(team);
    }
  };

  const handleCompareClick = () => {
    if (isInCompare(team.teamNumber)) {
      removeFromCompare(team.teamNumber);
    } else if (canAddToCompare) {
      addToCompare(team);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        size="icon"
        variant="outline"
        onClick={handleFavoriteClick}
        title={isFavorite(team.teamNumber) ? 'Remove from Favorites' : 'Add to Favorites'}
        className={`h-10 w-10 ${
          isFavorite(team.teamNumber)
            ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
            : 'text-gray-600 hover:text-red-600'
        }`}
      >
        <Heart className={`h-5 w-5 ${isFavorite(team.teamNumber) ? 'fill-current' : ''}`} />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={handleCompareClick}
        disabled={!canAddToCompare && !isInCompare(team.teamNumber)}
        title={isInCompare(team.teamNumber) ? 'Remove from Compare' : 'Add to Compare'}
        className={`h-10 w-10 ${
          isInCompare(team.teamNumber)
            ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
            : 'text-gray-600 hover:text-blue-600'
        }`}
      >
        <GitCompare className="h-5 w-5" />
      </Button>
    </div>
  );
} 