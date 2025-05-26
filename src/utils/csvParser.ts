import Papa from 'papaparse';
import type { Team } from '../types/team';

export async function parseTeamData(csvFile: File): Promise<Team[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvFile, {
      header: true,
      complete: (results) => {
        try {
          const teams = results.data.map((row: any) => ({
            teamNumber: row.teamNumber?.toString() || '',
            teamName: row.teamName?.toString() || '',
            worldSkillsStanding: Number(row.worldSkillsStanding) || 0,
            automationScore: Number(row.automationScore) || 0,
            manualScore: Number(row.manualScore) || 0,
            lastUpdated: row.lastUpdated?.toString() || new Date().toISOString(),
          }));
          resolve(teams);
        } catch (error) {
          reject(new Error('Failed to parse CSV data'));
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      },
    });
  });
}

export function validateTeamData(teams: Team[]): boolean {
  return teams.every((team) => {
    return (
      typeof team.teamNumber === 'string' &&
      typeof team.teamName === 'string' &&
      !isNaN(team.worldSkillsStanding) &&
      !isNaN(team.automationScore) &&
      !isNaN(team.manualScore) &&
      typeof team.lastUpdated === 'string'
    );
  });
} 