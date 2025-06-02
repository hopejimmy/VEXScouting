'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Trash2, GitCompare, Building, MapPin, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';
import { Header } from '@/components/navigation/Header';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useCompare } from '@/contexts/CompareContext';
import { useQuery } from '@tanstack/react-query';
import type { Team, Program } from '@/types/skills';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function FavoritesPage() {
  const router = useRouter();
  const { favorites, removeFromFavorites, clearFavorites } = useFavorites();
  const { addToCompare, removeFromCompare, isInCompare, canAddToCompare } = useCompare();
  const [mounted, setMounted] = useState(false);
  const [selectedMatchType, setSelectedMatchType] = useState<string>('');

  // Fetch available programs for filtering
  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/programs`);
      if (!response.ok) {
        throw new Error('Failed to fetch programs');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const handleCompareClick = (team: Team, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInCompare(team.teamNumber)) {
      removeFromCompare(team.teamNumber);
    } else if (canAddToCompare) {
      addToCompare(team);
    }
  };

  const handleRemoveFavorite = (teamNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromFavorites(teamNumber);
  };

  // Filter favorites by match type
  const filteredFavorites = selectedMatchType 
    ? favorites.filter(team => team.matchType === selectedMatchType)
    : favorites;

  // Get match type badge color
  const getMatchTypeBadgeColor = (matchType: string) => {
    switch (matchType) {
      case 'VEXIQ': return 'bg-green-100 text-green-700 border-green-200';
      case 'VEXU': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'VRC': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center space-x-3">
                <Heart className="w-8 h-8 text-red-500 fill-current" />
                <span>Favorite Teams</span>
              </h1>
              <p className="text-gray-600">
                {favorites.length === 0 
                  ? "You haven't added any teams to your favorites yet." 
                  : `You have ${favorites.length} favorite team${favorites.length === 1 ? '' : 's'}${filteredFavorites.length !== favorites.length ? ` (${filteredFavorites.length} shown)` : ''}.`
                }
              </p>
            </div>
            
            {/* Match Type Filter */}
            {favorites.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <label className="text-sm font-medium text-gray-700">
                    Competition Type:
                  </label>
                </div>
                <select
                  value={selectedMatchType}
                  onChange={(e) => setSelectedMatchType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Types</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.code}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </motion.div>

        {/* Empty State */}
        {favorites.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center py-16"
          >
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No favorites yet</h3>
            <p className="text-gray-600 mb-6">
              Start exploring teams and add them to your favorites to see them here.
            </p>
            <Button onClick={() => router.push('/')}>
              Explore Teams
            </Button>
          </motion.div>
        )}

        {/* No results after filtering */}
        {favorites.length > 0 && filteredFavorites.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center py-16"
          >
            <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No teams match this filter</h3>
            <p className="text-gray-600 mb-6">
              Try selecting a different competition type or clear the filter to see all favorites.
            </p>
            <Button onClick={() => setSelectedMatchType('')}>
              Clear Filter
            </Button>
          </motion.div>
        )}

        {/* Favorites Grid */}
        {filteredFavorites.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredFavorites.map((team, index) => (
              <motion.div
                key={team.teamNumber}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <FavoriteTeamCard 
                  team={team} 
                  onRemove={handleRemoveFavorite}
                  onCompare={handleCompareClick}
                  isInCompare={isInCompare(team.teamNumber)}
                  canAddToCompare={canAddToCompare}
                  onClick={() => router.push(`/team/${team.teamNumber}`)}
                  getMatchTypeBadgeColor={getMatchTypeBadgeColor}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}

function FavoriteTeamCard({ 
  team, 
  onRemove, 
  onCompare, 
  isInCompare, 
  canAddToCompare, 
  onClick,
  getMatchTypeBadgeColor
}: { 
  team: Team; 
  onRemove: (teamNumber: string, e: React.MouseEvent) => void;
  onCompare: (team: Team, e: React.MouseEvent) => void;
  isInCompare: boolean;
  canAddToCompare: boolean;
  onClick: () => void;
  getMatchTypeBadgeColor: (matchType: string) => string;
}) {
  return (
    <Card 
      className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white/80 backdrop-blur-sm border-gray-200 cursor-pointer group"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-md">
              <span className="text-white font-bold">
                {team.teamNumber.slice(-2)}
              </span>
            </div>
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
            {/* Action buttons */}
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => onCompare(team, e)}
                disabled={!canAddToCompare && !isInCompare}
                className={`h-8 w-8 p-0 ${
                  isInCompare 
                    ? 'text-blue-500 hover:text-blue-600' 
                    : 'text-gray-400 hover:text-blue-500'
                }`}
              >
                <GitCompare className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => onRemove(team.teamNumber, e)}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
              >
                <Heart className="h-4 w-4 fill-current" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">{team.organization}</span>
            <Badge className={getMatchTypeBadgeColor(team.matchType)}>
              {team.matchType}
            </Badge>
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