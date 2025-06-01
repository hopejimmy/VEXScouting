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

export interface TeamEvent {
  id: number;
  name: string;
  start: string;
  end: string;
  season: {
    id: number;
    name: string;
  };
  location: {
    venue: string;
    city: string;
    region: string;
    country: string;
  };
  divisions: string[];
  level: string;
  upcoming: boolean;
  type: string;
  awards?: Award[]; // Optional awards for this event
}

export interface Award {
  id: number;
  title: string;
  qualifications: string[];
  placement: number;
  eventId: number;
  teamId: number;
} 