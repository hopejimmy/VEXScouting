'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Trash2, GitCompare } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/navigation/Header';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useCompare } from '@/contexts/CompareContext';
import type { Team } from '@/types/skills';

export default function FavoritesPage() {
  const router = useRouter();
  const { favorites, removeFromFavorites, clearFavorites } = useFavorites();
  const { addToCompare, removeFromCompare, isInCompare, canAddToCompare } = useCompare();
  const [mounted, setMounted] = useState(false);

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
                  : `You have ${favorites.length} favorite team${favorites.length === 1 ? '' : 's'}.`
                }
              </p>
            </div>
            {favorites.length > 0 && (
              <Button
                variant="outline"
                onClick={clearFavorites}
                className="flex items-center space-x-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All</span>
              </Button>
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

        {/* Favorites Grid */}
        {favorites.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {favorites.map((team, index) => (
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
  onClick 
}: { 
  team: Team; 
  onRemove: (teamNumber: string, e: React.MouseEvent) => void;
  onCompare: (team: Team, e: React.MouseEvent) => void;
  isInCompare: boolean;
  canAddToCompare: boolean;
  onClick: () => void;
}) {
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