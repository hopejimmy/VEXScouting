import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function EventsError() {
  return (
    <Card className="bg-red-50">
      <CardContent className="pt-6">
        <div className="flex items-center space-x-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <p>Failed to load events. Please try again later.</p>
        </div>
      </CardContent>
    </Card>
  );
} 