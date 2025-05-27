export interface Team {
  teamNumber: string;
  teamName: string;
  organization: string;
  eventRegion: string;
  city: string;
  country: string;
  countryRegion: string;
  rank: number;
  score: number;
  autonomousSkills: number;
  driverSkills: number;
  highestAutonomousSkills: number;
  highestDriverSkills: number;
  highestAutonomousTimestamp: string;
  highestDriverTimestamp: string;
  highestAutonomousStopTime: number;
  highestDriverStopTime: number;
  // Computed properties for backward compatibility
  region?: string;
  skills?: SkillsData;
}

export interface SkillsData {
  programming: number;
  driver: number;
  maxProgramming: number;
  maxDriver: number;
  combined: number;
  rank: number;
  season: string;
}

export interface SearchResponse {
  teams: Team[];
  total: number;
} 