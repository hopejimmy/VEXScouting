import { parse } from 'csv-parse/sync';
import type { SkillsStanding, SkillsStandingsResponse } from '../types/skills.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function parseSkillsStandings(csvContent: string): SkillsStandingsResponse {
    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true
    }) as Record<string, string>[];

    const standings: SkillsStanding[] = records.map((record) => ({
        rank: parseInt(record.Rank),
        score: parseInt(record.Score),
        autonomousSkills: parseInt(record['Autonomous Coding Skills']),
        driverSkills: parseInt(record['Driver Skills']),
        highestAutonomousSkills: parseInt(record['Highest Autonomous Coding Skills']),
        highestDriverSkills: parseInt(record['Highest Driver Skills']),
        highestAutonomousTimestamp: new Date(record['Highest Autonomous Score Timestamp']),
        highestDriverTimestamp: new Date(record['Highest Driver Score Timestamp']),
        highestAutonomousStopTime: parseInt(record['Highest Autonomous Score Stop Time']),
        highestDriverStopTime: parseInt(record['Highest Driver Score Stop Time']),
        teamNumber: record['Team Number'],
        teamName: record['Team Name'],
        organization: record.Organization,
        eventRegion: record['Event Region'],
        country: record['Country / Region']
    }));

    return {
        standings,
        lastUpdated: new Date(),
        totalTeams: standings.length
    };
}

export function getLatestSkillsStandings(): SkillsStandingsResponse {
    const projectRoot = join(__dirname, '..', '..');
    const dataDir = join(projectRoot, 'public', 'data');
    const files = fs.readdirSync(dataDir)
        .filter(file => file.toLowerCase().includes('skills-standings'))
        .map(file => ({
            name: file,
            path: join(dataDir, file),
            mtime: fs.statSync(join(dataDir, file)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (files.length === 0) {
        throw new Error('No skills standings files found');
    }

    const latestFile = files[0];
    const csvContent = fs.readFileSync(latestFile.path, 'utf-8');
    return parseSkillsStandings(csvContent);
} 