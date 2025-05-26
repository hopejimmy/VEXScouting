import type { Team } from '../types/team';

interface FileInfo {
  name: string;
  lastModified: number;
}

export async function getLatestTeamDataFile(): Promise<File> {
  try {
    // Fetch the directory listing from the server
    const response = await fetch('/data/');
    const text = await response.text();
    
    // Parse the directory listing to find all CSV files
    const csvFiles = text.match(/[^/]+\.csv/g) || [];
    
    if (csvFiles.length === 0) {
      throw new Error('No CSV files found in the data directory');
    }

    // Get file information including last modified time
    const fileInfos: FileInfo[] = await Promise.all(
      csvFiles.map(async (filename) => {
        const fileResponse = await fetch(`/data/${filename}`);
        const lastModified = new Date(fileResponse.headers.get('last-modified') || '').getTime();
        return { name: filename, lastModified };
      })
    );

    // Sort files by last modified time (newest first) and get the latest
    const latestFile = fileInfos.sort((a, b) => b.lastModified - a.lastModified)[0];
    const fileResponse = await fetch(`/data/${latestFile.name}`);
    const csvText = await fileResponse.text();
    
    return new File([csvText], latestFile.name, { type: 'text/csv' });
  } catch (error) {
    console.error('Error fetching latest team data file:', error);
    throw new Error('Failed to fetch latest team data file');
  }
}

export function generateTeamDataFilename(): string {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[-:]/g, '')  // Remove dashes and colons
    .replace('T', '')      // Remove T
    .replace(/\.\d+Z$/, ''); // Remove milliseconds and Z
  return `teams_${timestamp}.csv`;
}

export async function saveTeamData(teams: Team[], filename: string): Promise<void> {
  try {
    // Ensure filename ends with .csv
    const csvFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    
    // Convert teams data to CSV
    const headers = ['teamNumber', 'teamName', 'worldSkillsStanding', 'automationScore', 'manualScore', 'lastUpdated'];
    const csvContent = [
      headers.join(','),
      ...teams.map(team => [
        team.teamNumber,
        `"${team.teamName.replace(/"/g, '""')}"`, // Escape quotes in team name
        team.worldSkillsStanding,
        team.automationScore,
        team.manualScore,
        team.lastUpdated
      ].join(','))
    ].join('\n');

    // Create a new file
    const file = new File([csvContent], csvFilename, { type: 'text/csv' });

    // In a real application, you would upload this file to the server
    // For now, we'll just log it
    console.log(`New team data file would be saved as: ${csvFilename}`);
    console.log('File contents:', csvContent);
  } catch (error) {
    console.error('Error saving team data:', error);
    throw new Error('Failed to save team data');
  }
}

// Helper function to validate CSV filename
export function isValidCsvFilename(filename: string): boolean {
  // Basic validation: filename should be non-empty and end with .csv
  return filename.length > 0 && filename.endsWith('.csv');
} 