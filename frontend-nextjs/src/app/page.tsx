'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Trophy, Search, Filter, Heart, GitCompare } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useCompare } from '@/contexts/CompareContext';
import { Header } from '@/components/navigation/Header';
import { Footer } from '@/components/navigation/Footer';
import type { Team, Program } from '@/types/skills';

// Force dynamic rendering for pages that use searchParams
export const dynamic = 'force-dynamic';

interface TeamsResponse {
  teams: Team[];
  total: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function searchTeams(query: string, matchType?: string): Promise<TeamsResponse> {
  if (!query.trim()) {
    // Return empty results when no search query
    return { teams: [], total: 0 };
  }

  const params = new URLSearchParams();
  params.append('q', query);
  if (matchType) params.append('matchType', matchType);

  const response = await fetch(`${API_BASE_URL}/api/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to search teams');
  }
  return response.json();
}

// Separate component that uses searchParams
function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inputQuery, setInputQuery] = useState(''); // For immediate input display
  const [query, setQuery] = useState(''); // For debounced search query
  const [selectedMatchType, setSelectedMatchType] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  // Fetch available programs
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

  // Sync with URL parameters after client-side hydration
  useEffect(() => {
    setIsClient(true);
    const urlQuery = searchParams.get('q') || '';
    const urlMatchType = searchParams.get('matchType') || '';
    setInputQuery(urlQuery); // Set both input and query to URL values
    setQuery(urlQuery);
    setSelectedMatchType(urlMatchType);
  }, [searchParams]);

  // Debounce search input - wait 1 second after user stops typing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setQuery(inputQuery);
      
      // Update URL when query changes (but not on initial load)
      if (isClient && inputQuery !== searchParams.get('q')) {
        const params = new URLSearchParams();
        if (inputQuery.trim()) params.append('q', inputQuery.trim());
        if (selectedMatchType) params.append('matchType', selectedMatchType);
        
        const newUrl = params.toString() ? `/?${params.toString()}` : '/';
        router.replace(newUrl); // Use replace instead of push to avoid history pollution
      }
    }, 1000);

    return () => clearTimeout(debounceTimer);
  }, [inputQuery, selectedMatchType, isClient, router, searchParams]);

  const { data, isLoading, error } = useQuery<TeamsResponse>({
    queryKey: ['teams', query, selectedMatchType],
    queryFn: () => searchTeams(query, selectedMatchType || undefined),
    enabled: isClient && query.trim().length > 0, // Only fetch when there's a search query
    staleTime: 10 * 60 * 1000, // 10 minutes - longer stale time for better persistence
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Immediately set query to current input to trigger search
    setQuery(inputQuery);
    
    // Update URL with search params
    const params = new URLSearchParams();
    if (inputQuery.trim()) params.append('q', inputQuery.trim());
    if (selectedMatchType) params.append('matchType', selectedMatchType);
    
    const newUrl = params.toString() ? `/?${params.toString()}` : '/';
    router.push(newUrl);
  };

  const handleMatchTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMatchType(e.target.value);
  };

  const hasResults = data && data.teams && data.teams.length > 0;
  const hasQuery = query.trim().length > 0;
  const isTyping = inputQuery.trim() !== query.trim(); // User is typing but search hasn't triggered yet

  // Prevent rendering until hydration is complete
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Find VEX Teams</h2>
            <p className="text-xl text-gray-600">Search and compare team performances across competitions</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Find VEX Teams
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Search and compare team performances across competitions
          </p>
          
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="flex flex-col gap-4">
              {/* Match Type Filter */}
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <label className="text-sm font-medium text-gray-700">
                    Competition Type:
                  </label>
                </div>
                <select
                  value={selectedMatchType}
                  onChange={handleMatchTypeChange}
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

              {/* Search Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="Search by team number or name..."
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {/* Search status indicator */}
                  {isTyping && inputQuery.trim().length > 0 && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <Button type="submit" size="lg" className="px-6">
                  Search
                </Button>
              </div>
            </div>
          </form>
        </motion.div>

        {/* Features & Marketing Section - shown when no search query, hidden when results appear */}
        {!hasQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-10"
          >
            {/* Platform Stats Dashboard */}
            <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  10,000+
                </div>
                <div className="text-sm text-gray-600 mt-1">Teams Tracked</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
                  3
                </div>
                <div className="text-sm text-gray-600 mt-1">Programs Supported</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                  500+
                </div>
                <div className="text-sm text-gray-600 mt-1">Events Monitored</div>
              </div>
            </div>

            {/* Core Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1: Instant Team Search */}
              <Card className="p-6 hover:shadow-lg transition-shadow border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Search className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Instant Rankings</h4>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Search any team instantly to view world skills rankings, autonomous and driver scores, 
                  and complete competition history across all seasons.
                </p>
              </Card>

              {/* Feature 2: Team Comparison */}
              <Card className="p-6 hover:shadow-lg transition-shadow border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <GitCompare className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Compare Teams</h4>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Compare up to 4 teams side-by-side. Analyze strengths, identify weaknesses, 
                  and find competitive advantages to improve your strategy.
                </p>
              </Card>

              {/* Feature 3: Event Scouting */}
              <Card className="p-6 hover:shadow-lg transition-shadow border-green-200 bg-gradient-to-br from-green-50 to-white">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Scout Events</h4>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  View complete event rankings and scout your opponents. See all competing teams, 
                  their skills scores, and prepare winning strategies before match day.
                </p>
              </Card>
            </div>

            {/* Why VEX Scouting Benefits */}
            <Card className="p-8 border-gray-200 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50">
              <div className="text-center max-w-3xl mx-auto">
                <h4 className="text-xl font-semibold text-gray-900 mb-6">
                  Why Choose VEX Scouting?
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl mb-2">⚡</div>
                    <div className="font-semibold text-blue-700 mb-2">Real-time Data</div>
                    <p className="text-sm text-gray-600">
                      Up-to-date skills rankings and competition results
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-2">🎯</div>
                    <div className="font-semibold text-purple-700 mb-2">Multi-Program Support</div>
                    <p className="text-sm text-gray-600">
                      Track VRC, VEXIQ, and VEXU teams in one unified platform
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-2">📊</div>
                    <div className="font-semibold text-green-700 mb-2">Advanced Analytics</div>
                    <p className="text-sm text-gray-600">
                      Deep insights into team performance and competitive trends
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {hasQuery && isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[...Array(9)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-3 w-[100px]" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </Card>
            ))}
          </motion.div>
        )}

        {hasQuery && error && (
          <Card className="p-8 text-center border-red-200 bg-red-50">
            <div className="text-red-600 mb-2">⚠️ Error</div>
            <p className="text-red-700">Failed to load teams. Please try again.</p>
          </Card>
        )}

        {hasQuery && data && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Results Summary */}
            {hasResults && (
              <div className="mb-6 text-center">
                <p className="text-gray-600">
                  Found {data.total} team{data.total !== 1 ? 's' : ''}
                  {selectedMatchType && (
                    <span className="ml-1">
                      in {programs.find(p => p.code === selectedMatchType)?.name || selectedMatchType}
                    </span>
                  )}
                  {query && <span className="ml-1">matching "{query}"</span>}
                </p>
              </div>
            )}

            {data && data.teams && data.teams.length === 0 && (
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
                    <TeamCard 
                      team={team} 
                      onClick={() => {
                        const currentUrl = window.location.pathname + window.location.search;
                        router.push(`/team/${team.teamNumber}?returnUrl=${encodeURIComponent(currentUrl)}`);
                      }} 
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}

// Main page component with Suspense boundary
export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Find VEX Teams</h2>
            <p className="text-xl text-gray-600">Search and compare team performances across competitions</p>
          </div>
        </main>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

function TeamCard({ team, onClick }: { team: Team; onClick?: () => void }) {
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();

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
    } else {
      addToCompare(team);
    }
  };

  const getMatchTypeBadgeColor = (matchType: string) => {
    switch (matchType) {
      case 'VEXIQ': return 'bg-green-100 text-green-700 border-green-200';
      case 'VEXU': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'VRC': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-gray-200 bg-white/80 backdrop-blur-sm" onClick={onClick}>
      <CardHeader className="pb-3">
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
