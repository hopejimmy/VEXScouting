import { Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Team } from '@/types/skills';

interface SkillsSectionProps {
  teamNumber: string;
  team: Team | undefined;
  isLoading: boolean;
  error: Error | null;
}

function SkillsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/2 mx-auto" />
              <div className="space-y-2">
                <Skeleton className="h-12 w-1/3 mx-auto" />
                <Skeleton className="h-4 w-1/4 mx-auto" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SkillsError() {
  return (
    <Card className="p-8 text-center border-red-200 bg-red-50">
      <div className="text-red-600 mb-2">⚠️ Error</div>
      <p className="text-red-700">Failed to fetch team skills. Please try again.</p>
    </Card>
  );
}

export function SkillsSection({ teamNumber, team, isLoading, error }: SkillsSectionProps) {
  if (isLoading) {
    return <SkillsSkeleton />;
  }

  if (error) {
    return <SkillsError />;
  }

  if (!team) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
        <Award className="w-6 h-6" />
        <span>Skills Performance</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="text-center">
            <CardTitle className="text-blue-700">Autonomous Skills</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-4xl font-bold text-blue-900 mb-2">
              {team.autonomousSkills}
            </div>
            <p className="text-sm text-blue-600">Points</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="text-center">
            <CardTitle className="text-purple-700">Driver Skills</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-4xl font-bold text-purple-900 mb-2">
              {team.driverSkills}
            </div>
            <p className="text-sm text-purple-600">Points</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="text-center">
            <CardTitle className="text-green-700">Total Score</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-4xl font-bold text-green-900 mb-2">
              {team.score}
            </div>
            <p className="text-sm text-green-600">Combined Points</p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
} 