'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GitCompare, Trash2, Heart, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/navigation/Header';
import { useCompare } from '@/contexts/CompareContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import type { Team } from '@/types/skills';

export default function ComparePage() {
  const router = useRouter();
  const { compareList, removeFromCompare, clearCompare } = useCompare();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-96 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const handleFavoriteClick = (team: Team) => {
    if (isFavorite(team.teamNumber)) {
      removeFromFavorites(team.teamNumber);
    } else {
      addToFavorites(team);
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
                <GitCompare className="w-8 h-8 text-blue-500" />
                <span>Compare Teams</span>
              </h1>
              <p className="text-gray-600">
                {compareList.length === 0 
                  ? "Add teams to your comparison list to analyze their performance side-by-side." 
                  : `Comparing ${compareList.length} team${compareList.length === 1 ? '' : 's'}.`
                }
              </p>
            </div>
            {compareList.length > 0 && (
              <Button
                variant="outline"
                onClick={clearCompare}
                className="flex items-center space-x-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All</span>
              </Button>
            )}
          </div>
        </motion.div>

        {/* Empty State */}
        {compareList.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center py-16"
          >
            <GitCompare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No teams to compare</h3>
            <p className="text-gray-600 mb-6">
              Search for teams and add them to your comparison list to see detailed analytics.
            </p>
            <Button onClick={() => router.push('/')}>
              Find Teams to Compare
            </Button>
          </motion.div>
        )}

        {/* Comparison Grid */}
        {compareList.length > 0 && (
          <>
            {/* Teams Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            >
              {compareList.map((team, index) => (
                <motion.div
                  key={team.teamNumber}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <CompareTeamCard 
                    team={team}
                    onRemove={() => removeFromCompare(team.teamNumber)}
                    onFavorite={() => handleFavoriteClick(team)}
                    isFavorite={isFavorite(team.teamNumber)}
                    onClick={() => router.push(`/team/${team.teamNumber}`)}
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Detailed Comparison Table */}
            {compareList.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card className="bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Trophy className="w-5 h-5" />
                      <span>Performance Comparison</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ComparisonTable teams={compareList} />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function CompareTeamCard({ 
  team, 
  onRemove, 
  onFavorite, 
  isFavorite, 
  onClick 
}: { 
  team: Team; 
  onRemove: () => void;
  onFavorite: () => void;
  isFavorite: boolean;
  onClick: () => void;
}) {
  return (
    <Card 
      className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white/80 backdrop-blur-sm border-gray-200 cursor-pointer"
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
              <p className="text-sm text-gray-600 truncate">
                {team.teamName}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
              #{team.rank}
            </Badge>
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onFavorite();
                }}
                className={`h-6 w-6 p-0 ${
                  isFavorite 
                    ? 'text-red-500 hover:text-red-600' 
                    : 'text-gray-400 hover:text-red-500'
                }`}
              >
                <Heart className={`h-3 w-3 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="text-xs text-gray-600 truncate">
            {team.organization}
          </div>
          
          <div className="text-xs text-gray-500 truncate">
            {team.eventRegion}, {team.country}
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
          
          <div className="text-center pt-2 border-t border-gray-100">
            <div className="text-xl font-bold text-green-600">{team.score}</div>
            <div className="text-xs text-gray-500">Total Score</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonTable({ teams }: { teams: Team[] }) {
  const metrics = [
    { key: 'rank', label: 'Rank', format: (val: number) => `#${val}` },
    { key: 'score', label: 'Total Score', format: (val: number) => val.toString() },
    { key: 'autonomousSkills', label: 'Autonomous Skills', format: (val: number) => val.toString() },
    { key: 'driverSkills', label: 'Driver Skills', format: (val: number) => val.toString() },
  ];

  const getBestInMetric = (metric: string) => {
    if (metric === 'rank') {
      return Math.min(...teams.map(team => team[metric as keyof Team] as number));
    }
    return Math.max(...teams.map(team => team[metric as keyof Team] as number));
  };

  const isMetricBest = (team: Team, metric: string) => {
    const value = team[metric as keyof Team] as number;
    const best = getBestInMetric(metric);
    return value === best;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Metric</th>
            {teams.map((team) => (
              <th key={team.teamNumber} className="text-center py-3 px-4 font-semibold text-gray-900">
                {team.teamNumber}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => (
            <tr key={metric.key} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 font-medium text-gray-700">{metric.label}</td>
              {teams.map((team) => {
                const value = team[metric.key as keyof Team] as number;
                const isBest = isMetricBest(team, metric.key);
                return (
                  <td key={team.teamNumber} className="text-center py-3 px-4">
                    <span className={`font-semibold ${
                      isBest 
                        ? 'text-green-600 bg-green-100 px-2 py-1 rounded-full' 
                        : 'text-gray-900'
                    }`}>
                      {metric.format(value)}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 