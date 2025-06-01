import { Heart, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionButtonProps {
  icon: 'heart' | 'compare';
  isActive: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ActionButton({ icon, isActive, onClick, size = 'sm' }: ActionButtonProps) {
  const getIcon = () => {
    switch (icon) {
      case 'heart':
        return <Heart className={`h-4 w-4 ${isActive ? 'fill-current' : ''}`} />;
      case 'compare':
        return <GitCompare className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getActiveStyles = () => {
    switch (icon) {
      case 'heart':
        return isActive 
          ? 'text-red-500 hover:text-red-600' 
          : 'text-gray-400 hover:text-red-500';
      case 'compare':
        return isActive 
          ? 'text-blue-500 hover:text-blue-600' 
          : 'text-gray-400 hover:text-blue-500';
      default:
        return 'text-gray-400 hover:text-gray-600';
    }
  };

  return (
    <Button
      size={size}
      variant="ghost"
      onClick={onClick}
      className={`h-8 w-8 p-0 ${getActiveStyles()}`}
    >
      {getIcon()}
    </Button>
  );
} 