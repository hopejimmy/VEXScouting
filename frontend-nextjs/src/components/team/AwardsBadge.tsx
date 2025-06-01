import { Trophy, Medal, Award as AwardIcon, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Award } from '@/types/skills';

interface AwardsBadgeProps {
  awards: Award[];
  maxDisplay?: number;
}

function getAwardIcon(title: string, placement: number) {
  const lowerTitle = title.toLowerCase();
  
  // Excellence, Champion, Winner awards get trophy icon
  if (lowerTitle.includes('excellence') || lowerTitle.includes('champion') || lowerTitle.includes('winner') || placement === 1) {
    return <Trophy className="w-3 h-3" />;
  }
  
  // Tournament awards, finalists get medal icon
  if (lowerTitle.includes('tournament') || lowerTitle.includes('finalist') || placement <= 3) {
    return <Medal className="w-3 h-3" />;
  }
  
  // Special awards get star icon
  if (lowerTitle.includes('sportsmanship') || lowerTitle.includes('design') || lowerTitle.includes('innovation')) {
    return <Star className="w-3 h-3" />;
  }
  
  // Default award icon
  return <AwardIcon className="w-3 h-3" />;
}

function getAwardVariant(title: string, placement: number): "default" | "secondary" | "destructive" | "outline" {
  const lowerTitle = title.toLowerCase();
  
  // Excellence, Champion, Winner awards get gold (default) styling
  if (lowerTitle.includes('excellence') || lowerTitle.includes('champion') || lowerTitle.includes('winner') || placement === 1) {
    return 'default';
  }
  
  // Tournament awards, finalists get silver (secondary) styling
  if (lowerTitle.includes('tournament') || lowerTitle.includes('finalist') || placement <= 3) {
    return 'secondary';
  }
  
  // All other awards get outline styling
  return 'outline';
}

function getShortAwardName(title: string): string {
  // Remove common suffixes
  let shortName = title
    .replace(/\s*\(.*?\)\s*/g, '') // Remove text in parentheses
    .replace(/\s*Award\s*$/i, '') // Remove "Award" suffix
    .replace(/\s*Winner\s*$/i, '') // Remove "Winner" suffix
    .replace(/\s*Champion\s*$/i, '') // Remove "Champion" suffix
    .trim();
  
  // Handle specific common award names
  const commonAwards: Record<string, string> = {
    'Excellence': 'Excellence',
    'Tournament Champions': 'Champions',
    'Tournament Finalists': 'Finalists',
    'Robot Skills Champion': 'Skills',
    'Programming Skills Champion': 'Programming',
    'Driver Skills Champion': 'Driver',
    'Design': 'Design',
    'Sportsmanship': 'Sportsmanship',
    'Innovation': 'Innovation',
    'Think': 'Think',
    'Connect': 'Connect',
    'Teamwork Champion': 'Teamwork',
    'Judges': 'Judges'
  };
  
  // Check if it's a known award type
  for (const [fullName, shortName] of Object.entries(commonAwards)) {
    if (title.toLowerCase().includes(fullName.toLowerCase())) {
      return shortName;
    }
  }
  
  // If it's too long, truncate it
  if (shortName.length > 12) {
    shortName = shortName.substring(0, 12) + '...';
  }
  
  return shortName;
}

export function AwardsBadge({ awards, maxDisplay = 3 }: AwardsBadgeProps) {
  if (!awards || awards.length === 0) {
    return null;
  }

  const displayAwards = awards.slice(0, maxDisplay);
  const remainingCount = awards.length - maxDisplay;

  return (
    <div className="flex flex-wrap gap-1">
      {displayAwards.map((award) => (
        <Badge
          key={award.id}
          variant={getAwardVariant(award.title, award.placement)}
          className="flex items-center gap-1 text-xs px-2 py-1"
          title={award.title} // Full title on hover
        >
          {getAwardIcon(award.title, award.placement)}
          <span>{getShortAwardName(award.title)}</span>
        </Badge>
      ))}
      
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs px-2 py-1">
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
} 