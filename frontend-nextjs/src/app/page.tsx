'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Search, Trophy, Users, Target, Zap, Heart, GitCompare } from 'lucide-react';
import { motion } from 'framer-motion';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/navigation/Header';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useCompare } from '@/contexts/CompareContext';
import type { SearchResponse, Team } from '@/types/skills';

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const { clearFavorites } = useFavorites();
  const { clearCompare } = useCompare();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const clearAllStorage = () => {
    clearFavorites();
    clearCompare();
    localStorage.removeItem('vex-scouting-favorites');
    localStorage.removeItem('vex-scouting-compare');
  };
  
  const { data, isLoading, error } = useQuery<SearchResponse>({
    queryKey: ['teams', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { teams: [], total: 0 };
      const response = await fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Failed to fetch teams');
      return response.json();
    },
    enabled: searchQuery.trim().length > 0 && mounted,
  });

  const hasResults = data?.teams && data.teams.length > 0;

  if (!mounted) {
    return (
      <div className="min-h-screen">
        <Header />

        {/* Loading state */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
              Discover VEX Teams
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Search and analyze VEX Robotics teams worldwide. Get insights into skills scores, rankings, and performance data.
            </p>
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <div className="pl-12 pr-4 py-6 text-lg rounded-2xl border-2 border-gray-200 shadow-lg bg-white h-[72px]" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            Discover VEX Teams
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Search and analyze VEX Robotics teams worldwide. Get insights into skills scores, rankings, and performance data.
          </p>
          
          {/* Add clear storage button for development */}
          <Button
            variant="outline"
            onClick={clearAllStorage}
            className="mb-4 text-red-600 border-red-200 hover:bg-red-50"
          >
            Clear Favorites & Compare Lists
          </Button>
          
          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl mx-auto mb-8"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
              <input
                type="text"
                placeholder="Search by team number or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-6 text-lg rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-lg transition-all duration-200"
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Stats Cards */}
        {!searchQuery.trim() && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          >
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700">Total Teams</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">25,000+</div>
                <p className="text-xs text-blue-600">Worldwide VEX teams</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700">Skills Scores</CardTitle>
                <Target className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900">1M+</div>
                <p className="text-xs text-purple-600">Recorded skills runs</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700">Live Data</CardTitle>
                <Zap className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900">Real-time</div>
                <p className="text-xs text-green-600">Updated continuously</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Search Results */}
        {searchQuery.trim() && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[150px]" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </Card>
                ))}
              </div>
            )}

            {error && (
              <Card className="p-8 text-center border-red-200 bg-red-50">
                <div className="text-red-600 mb-2">⚠️ Error</div>
                <p className="text-red-700">Failed to fetch teams. Please try again.</p>
              </Card>
            )}

            {data && data.teams && data.teams.length === 0 && !isLoading && (
              <Card className="p-8 text-center border-gray-200 bg-gray-50">
                <div className="text-gray-400 mb-2">🔍</div>
                <p className="text-gray-600">No teams found matching your search.</p>
              </Card>
            )}

            {hasResults && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {data.teams.map((team, index) => (
                  <motion.div
                    key={team.teamNumber}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <TeamCard team={team} onClick={() => router.push(`/team/${team.teamNumber}`)} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}

function TeamCard({ team, onClick }: { team: Team; onClick?: () => void }) {
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { addToCompare, removeFromCompare, isInCompare, canAddToCompare } = useCompare();

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavorite(team.teamNumber)) {
      removeFromFavorites(team.teamNumber);
    } else {
      addToFavorites(team);
    }
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInCompare(team.teamNumber)) {
      removeFromCompare(team.teamNumber);
    } else if (canAddToCompare) {
      addToCompare(team);
    }
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white/80 backdrop-blur-sm border-gray-200 cursor-pointer group"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-500">
              <AvatarFallback className="text-white font-bold">
                {team.teamNumber.slice(-2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">
                {team.teamNumber}
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                {team.teamName}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
              #{team.rank}
            </Badge>
            {/* Action buttons - shown on hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleFavoriteClick}
                className={`h-8 w-8 p-0 ${
                  isFavorite(team.teamNumber) 
                    ? 'text-red-500 hover:text-red-600' 
                    : 'text-gray-400 hover:text-red-500'
                }`}
              >
                <Heart className={`h-4 w-4 ${isFavorite(team.teamNumber) ? 'fill-current' : ''}`} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCompareClick}
                disabled={!canAddToCompare && !isInCompare(team.teamNumber)}
                className={`h-8 w-8 p-0 ${
                  isInCompare(team.teamNumber) 
                    ? 'text-blue-500 hover:text-blue-600' 
                    : 'text-gray-400 hover:text-blue-500'
                }`}
              >
                <GitCompare className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <span className="font-medium">{team.organization}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-500">
            <span>{team.eventRegion}, {team.country}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{team.autonomousSkills}</div>
              <div className="text-xs text-gray-500">Autonomous</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{team.driverSkills}</div>
              <div className="text-xs text-gray-500">Driver</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
