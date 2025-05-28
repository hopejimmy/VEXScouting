import { motion } from 'framer-motion';
import { Calendar, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { TeamEvent } from '@/types/skills';
import { EventsSkeleton } from './EventsSkeleton';
import { EventsError } from './EventsError';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSeasons } from '@/hooks/useSeasons';

interface EventsSectionProps {
  teamNumber: string;
  events: TeamEvent[];
  isLoading: boolean;
  error: Error | null;
  onSeasonChange: (seasonId: string) => void;
  currentSeasonId: string;
}

export function EventsSection({ 
  teamNumber, 
  events, 
  isLoading, 
  error, 
  onSeasonChange,
  currentSeasonId 
}: EventsSectionProps) {
  const { data: seasons, isLoading: isSeasonsLoading } = useSeasons();

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
          value={currentSeasonId}
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
          events.map((event) => (
            <Card key={event.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span>{event.name}</span>
                  <Badge variant={event.upcoming ? "default" : "secondary"}>
                    {event.upcoming ? "Upcoming" : "Past"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
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
                  <div className="flex flex-wrap gap-2 mt-2">
                    {event.divisions.map((division) => (
                      <Badge key={division} variant="outline">{division}</Badge>
                    ))}
                    <Badge variant="outline">{event.level}</Badge>
                    {event.type && <Badge variant="outline">{event.type}</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </motion.div>
  );
} 