import { motion } from 'framer-motion';
import { Calendar, MapPin } from 'lucide-react';
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

  // Fetch awards for all events
  // CRITICAL: Pass matchType to prevent race condition and ensure correct program filtering
  const eventIds = events.map(event => event.id);
  const { data: awardsMap, isLoading: isAwardsLoading } = useMultipleTeamAwards(
    teamNumber,
    eventIds,
    matchType
  );

  // Handle event card click
  const handleEventClick = (event: TeamEvent) => {
    // If event is past (not upcoming), go to match list
    if (!event.upcoming) {
      // Use the first division ID if available, otherwise empty string (though backend should always provide it now)
      const divisionId = event.divisions[0]?.id || '';

      const params = new URLSearchParams({
        divisionId: divisionId.toString(),
        matchType,
        eventName: event.name,
        start: event.start,
        end: event.end
      });

      router.push(`/team/${teamNumber}/event/${event.id}?${params.toString()}`);
    } else {
      // Existing behavior for upcoming events
      const confirmed = window.confirm(
        `Would you like to see the world skills rankings for all teams competing in "${event.name}"?`
      );

      if (confirmed) {
        router.push(`/event-rankings/${event.id}?matchType=${matchType}&eventName=${encodeURIComponent(event.name)}&returnUrl=/team/${teamNumber}`);
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
                    <Badge variant={event.upcoming ? "default" : "secondary"}>
                      {event.upcoming ? "Upcoming" : "Past"}
                    </Badge>
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