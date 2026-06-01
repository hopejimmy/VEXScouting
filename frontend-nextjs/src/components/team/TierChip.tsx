import { Badge } from '@/components/ui/badge';

interface TierChipProps {
  tier: string;
  className?: string;
}

const TIER_STYLES: Record<string, string> = {
  Elite:       'bg-purple-100 text-purple-700 border-purple-200',
  High:        'bg-blue-100 text-blue-700 border-blue-200',
  'Mid-High':  'bg-teal-100 text-teal-700 border-teal-200',
  Mid:         'bg-gray-100 text-gray-700 border-gray-200',
  Developing:  'bg-amber-100 text-amber-700 border-amber-200',
};

/**
 * Color-coded tier badge. Falls back to Developing styling for
 * unknown tier strings (e.g. when the legacy backend response is
 * displayed via this component on a non-VRC code path).
 */
export function TierChip({ tier, className = '' }: TierChipProps) {
  const style = TIER_STYLES[tier] || TIER_STYLES['Developing'];
  return (
    <Badge variant="outline" className={`text-xs font-medium ${style} ${className}`}>
      {tier}
    </Badge>
  );
}
