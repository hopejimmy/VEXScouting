import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { TeamEvent } from '@/types/skills';
import { EventsSkeleton } from './EventsSkeleton';
import { EventsError } from './EventsError';
import { AwardsBadge } from './AwardsBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMultipleTeamAwards } from '@/hooks/useAwards';

interface Season {
  id: number;
  name: string;
  start: string;
  end: string;
}

interface EventsSectionProps {
  teamNumber: string;
  events: TeamEvent[];
  isLoading: boolean;
  error: Error | null;
  onSeasonChange: (seasonId: string) => void;
  currentSeasonId: string | null;
  matchType?: string;
  seasons?: Season[];
  isSeasonsLoading?: boolean;
}

export function EventsSection({
  teamNumber,
  events,
  isLoading,
  error,
  onSeasonChange,
  currentSeasonId,
  matchType = 'VRC',
  seasons = [],
  isSeasonsLoading = false
}: EventsSectionProps) {
  const router = useRouter();
  const [resolvingEventId, setResolvingEventId] = useState<number | null>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  // Fetch awards for all events
  // CRITICAL: Pass matchType to prevent race condition and ensure correct program filtering
  const eventIds = events.map(event => event.id);
  const { data: awardsMap, isLoading: isAwardsLoading } = useMultipleTeamAwards(
    teamNumber,
    eventIds,
    matchType
  );

  // Handle event card click
  const handleEventClick = async (event: TeamEvent) => {
    if (resolvingEventId === event.id) return; // prevent double-click during lookup

    let divisionId: string = event.divisions[0]?.id?.toString() || '';
    let divisionName: string = event.divisions[0]?.name || '';

    // Multi-division events (World Championship) need an API call to find which
    // specific division this team competes in. Single-division events skip this.
    if (event.divisions.length > 1) {
      setResolvingEventId(event.id);
      try {
        const divisionIds = event.divisions.map(d => d.id).join(',');
        const divisionNames = event.divisions.map(d => d.name).join(',');
        const response = await fetch(
          `${API_BASE_URL}/api/events/${event.id}/teams/${teamNumber}/division` +
          `?divisionIds=${encodeURIComponent(divisionIds)}&divisionNames=${encodeURIComponent(divisionNames)}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.divisionId) {
            divisionId = data.divisionId.toString();
            divisionName = data.divisionName || '';
          }
        }
        // On network error or divisionId: null — fall through with empty string.
        // Rankings page will show all teams (safe unfiltered fallback).
      } catch {
        // Network error — fall through to unfiltered navigation
      } finally {
        setResolvingEventId(null);
      }
    }

    if (!event.upcoming) {
      // Past event → match detail page
      const params = new URLSearchParams({
        divisionId,
        matchType,
        eventName: event.name,
        start: event.start,
        end: event.end
      });
      if (divisionName) params.append('divisionName', divisionName);
      router.push(`/team/${teamNumber}/event/${event.id}?${params.toString()}`);
    } else {
      // Future event → rankings page
      const confirmed = window.confirm(
        `Would you like to see the world skills rankings for teams competing in "${event.name}"` +
        `${divisionName ? ` — ${divisionName}` : ''}?`
      );
      if (confirmed) {
        const params = new URLSearchParams({
          matchType,
          eventName: event.name,
          returnUrl: `/team/${teamNumber}`,
          highlightTeam: teamNumber,
        });
        if (divisionId) params.append('divisionId', divisionId);
        if (divisionName) params.append('divisionName', divisionName);
        router.push(`/event-rankings/${event.id}?${params.toString()}`);
      }
    }
  };

  if (isLoading) {
    return <EventsSkeleton />;
  }

  if (error) {
    return <EventsError />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <Calendar className="w-6 h-6" />
          <span>Season Events</span>
        </h2>

        <Select
          value={currentSeasonId || undefined}
          onValueChange={onSeasonChange}
          disabled={isSeasonsLoading}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a season" />
          </SelectTrigger>
          <SelectContent>
            {seasons?.map((season) => (
              <SelectItem key={season.id} value={season.id.toString()}>
                {season.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {events.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-500 text-center">No events found for this season</p>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => {
            const eventAwards = awardsMap?.[event.id] || [];

            return (
              <Card
                key={event.id}
                className="hover:shadow-lg transition-shadow cursor-pointer hover:border-blue-300"
                onClick={() => handleEventClick(event)}
              >
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span>{event.name}</span>
                    <div className="flex items-center gap-2">
                      {resolvingEventId === event.id && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      )}
                      <Badge variant={event.upcoming ? "default" : "secondary"}>
                        {event.upcoming ? "Upcoming" : "Past"}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>
                        {new Date(event.start).toLocaleDateString()} - {new Date(event.end).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>
                        {[event.location.venue, event.location.city, event.location.region]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>

                    {/* Awards Section */}
                    {!event.upcoming && (
                      <div className="space-y-2">
                        {isAwardsLoading ? (
                          <div className="flex gap-2">
                            <Skeleton className="h-6 w-16" />
                            <Skeleton className="h-6 w-20" />
                          </div>
                        ) : eventAwards.length > 0 ? (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Awards:</p>
                            <AwardsBadge awards={eventAwards} maxDisplay={3} />
                          </div>
                        ) : null}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-2">
                      {event.divisions.map((division) => (
                        <Badge key={division.id} variant="outline">{division.name}</Badge>
                      ))}
                      <Badge variant="outline">{event.level}</Badge>
                      {event.type && <Badge variant="outline">{event.type}</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </motion.div>
  );
} 