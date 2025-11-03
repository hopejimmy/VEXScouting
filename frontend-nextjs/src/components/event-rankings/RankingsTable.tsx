'use client';

import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Trophy, Target, Gamepad2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { EventRanking } from '@/types/skills';

interface RankingsTableProps {
  rankings: EventRanking[];
  highlightTeam?: string;
}

type SortField = 'eventRank' | 'worldRank' | 'combinedScore' | 'autonomousSkills' | 'driverSkills';
type SortDirection = 'asc' | 'desc';

export function RankingsTable({ rankings, highlightTeam }: RankingsTableProps) {
  const [sortField, setSortField] = useState<SortField>('eventRank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedRankings = [...rankings].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return (aVal > bVal ? 1 : -1) * multiplier;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-blue-600" />
      : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="overflow-x-auto">
      <Card>
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th 
                className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('eventRank')}
              >
                <div className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4" />
                  <span>Event Rank</span>
                  <SortIcon field="eventRank" />
                </div>
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Team
              </th>
              <th 
                className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('worldRank')}
              >
                <div className="flex items-center space-x-2">
                  <span>World Rank</span>
                  <SortIcon field="worldRank" />
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('combinedScore')}
              >
                <div className="flex items-center space-x-2">
                  <span>Score</span>
                  <SortIcon field="combinedScore" />
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('autonomousSkills')}
              >
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4" />
                  <span>Auto</span>
                  <SortIcon field="autonomousSkills" />
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('driverSkills')}
              >
                <div className="flex items-center space-x-2">
                  <Gamepad2 className="w-4 h-4" />
                  <span>Driver</span>
                  <SortIcon field="driverSkills" />
                </div>
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Organization
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Region
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedRankings.map((team) => {
              const isHighlighted = team.teamNumber === highlightTeam;
              
              return (
                <tr 
                  key={team.teamNumber}
                  className={`hover:bg-gray-50 ${isHighlighted ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {team.eventRank <= 3 && (
                        <span className="text-2xl">
                          {team.eventRank === 1 ? '🥇' : team.eventRank === 2 ? '🥈' : '🥉'}
                        </span>
                      )}
                      <span className="text-lg font-bold text-gray-900">
                        #{team.eventRank}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900">{team.teamNumber}</span>
                      <span className="text-sm text-gray-600">{team.teamName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge 
                      variant="outline" 
                      className={team.worldRank <= 10 ? 'bg-yellow-50 text-yellow-700 border-yellow-300' : ''}
                    >
                      #{team.worldRank}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-lg font-bold text-blue-600">{team.combinedScore}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{team.highestAutonomousSkills}</span>
                      <span className="text-xs text-gray-500">avg: {team.autonomousSkills}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{team.highestDriverSkills}</span>
                      <span className="text-xs text-gray-500">avg: {team.driverSkills}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">{team.organization}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{team.region}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {rankings.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No ranking data available for teams in this event</p>
            <p className="text-sm mt-2">Teams may not have participated in skills challenges yet</p>
          </div>
        )}
      </Card>
    </div>
  );
}

