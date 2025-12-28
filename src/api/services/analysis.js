import fetch from 'node-fetch';
import { create, all } from 'mathjs';

const math = create(all);
const ROBOTEVENTS_BASE_URL = 'https://www.robotevents.com/api/v2';

/**
 * Fetches all items from a paginated RobotEvents endpoint
 */
async function fetchAllPages(endpoint, token) {
    let allItems = [];
    let currentPage = 1;
    let lastPage = 1;

    do {
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${endpoint}${separator}page=${currentPage}&per_page=250`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error URL: ${endpoint}?page=${currentPage}&per_page=250`);
            console.error(`API Error Body: ${errorText}`);
            throw new Error(`RobotEvents API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        allItems = allItems.concat(data.data);
        lastPage = data.meta.last_page;
        currentPage++;
    } while (currentPage <= lastPage);

    return allItems;
}

/**
 * Calculates OPR, DPR, and CCWM for an event
 */
function calculateEventStats(matches, teams) {
    // 1. Map teams to indices
    const teamToIndex = new Map();
    const indexToTeam = new Map();
    teams.forEach((team, index) => {
        teamToIndex.set(team, index);
        indexToTeam.set(index, team);
    });

    const numTeams = teams.length;
    if (numTeams === 0) return {};

    // 2. Initialize Matrices
    // A: Team Participation Matrix (Rows = Teams, Cols = Teams) - Symmetric
    // B_scores: Sum of Scores (Rows = Teams, Cols = 1)
    // B_opp_scores: Sum of Opponent Scores (Rows = Teams, Cols = 1)
    // B_margins: Sum of Winning Margins (Rows = Teams, Cols = 1)

    // We strictly use mathjs 'matrix' or 'dense' arrays
    const A = math.zeros(numTeams, numTeams).toArray();
    const B_opr = math.zeros(numTeams, 1).toArray();
    const B_dpr = math.zeros(numTeams, 1).toArray();
    const B_ccwm = math.zeros(numTeams, 1).toArray();

    // 3. Process Matches
    matches.forEach(match => {
        if (!match.scored) return; // Skip unplayed matches

        const redTeams = match.alliances.red.team_objects.map(t => t.name);
        const blueTeams = match.alliances.blue.team_objects.map(t => t.name);
        const redScore = match.alliances.red.score;
        const blueScore = match.alliances.blue.score;

        // Update Matrix A (Participation)
        // For standard 2v2 VRC:
        // A[i][j] increments if Team i and Team j played TOGETHER
        // Does NOT involve opponents.

        [redTeams, blueTeams].forEach((allianceTeams, allianceIdx) => {
            const score = allianceIdx === 0 ? redScore : blueScore;
            const oppScore = allianceIdx === 0 ? blueScore : redScore;
            const margin = score - oppScore;

            for (let i = 0; i < allianceTeams.length; i++) {
                const teamI = allianceTeams[i];
                if (!teamToIndex.has(teamI)) continue; // Should not happen if teams list is complete
                const idxI = teamToIndex.get(teamI);

                // Update B vectors
                B_opr[idxI][0] += score;
                B_dpr[idxI][0] += oppScore;
                B_ccwm[idxI][0] += margin;

                for (let j = 0; j < allianceTeams.length; j++) {
                    const teamJ = allianceTeams[j];
                    if (!teamToIndex.has(teamJ)) continue;
                    const idxJ = teamToIndex.get(teamJ);

                    A[idxI][idxJ] += 1;
                }
            }
        });
    });

    // 4. Solve Ax = B
    // Using LU decomposition for stability
    let oprResult, dprResult, ccwmResult;
    try {
        oprResult = math.lusolve(A, B_opr);
        dprResult = math.lusolve(A, B_dpr);
        ccwmResult = math.lusolve(A, B_ccwm);
    } catch (error) {
        console.error("Matrix solve failed (likely singular matrix due to disconnected graph):", error);
        // Fallback: Return zeros or handle partially? 
        // For now return empty, meaning we can't calc useful stats for this event subset
        return {};
    }

    // 5. Format Results
    const stats = {};
    for (let i = 0; i < numTeams; i++) {
        const teamNum = indexToTeam.get(i);
        stats[teamNum] = {
            opr: Number(oprResult[i][0].toFixed(2)),
            dpr: Number(dprResult[i][0].toFixed(2)),
            ccwm: Number(ccwmResult[i][0].toFixed(2))
        };
    }

    return stats;
}

/**
 * Main function to process an event
 */
export async function processEvent(pool, event, apiKey) {
    if (!apiKey) throw new Error("API Key required");

    const { id, sku } = event;

    // 1. Fetch Event Info/Matches from RobotEvents
    console.log(`Fetching detailed info for event ${sku} (ID: ${id})...`);

    // Fetch event details to get divisions
    let eventDetails = event;
    if (!event.divisions) {
        const eventResponse = await fetchAllPages(`${ROBOTEVENTS_BASE_URL}/events/${id}`, apiKey);
        // API returns object, not list? fetchAllPages expects paginated list?
        // fetchAllPages handles "data" property.
        // events/{id} returns the object directly usually.
        // Let's use simple fetch for single object.
        // Actually RobotEvents V2 events/{id} returns the object.
        // Let's make a helper or just use fetch here.
        const res = await fetch(`${ROBOTEVENTS_BASE_URL}/events/${id}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        eventDetails = await res.json();
    }

    const divisions = eventDetails.divisions || [];
    let matches = [];

    console.log(`Event ${sku} has ${divisions.length} divisions.`);

    for (const div of divisions) {
        console.log(`Fetching matches for Division ${div.name} (ID: ${div.id})...`);
        const divMatches = await fetchAllPages(`${ROBOTEVENTS_BASE_URL}/events/${id}/divisions/${div.id}/matches`, apiKey);
        matches = matches.concat(divMatches);
    }

    // Filter for only 'scored' matches to ensure we only use valid data
    const scoredMatches = matches.filter(m => m.scored);

    if (scoredMatches.length === 0) {
        console.log(`No scored matches found for ${sku}`);
        return;
    }

    // 2. Identify all teams
    const teamSet = new Set();
    matches.forEach(m => {
        m.alliances.red.team_objects.forEach(t => teamSet.add(t.name));
        m.alliances.blue.team_objects.forEach(t => teamSet.add(t.name));
    });
    const teamList = Array.from(teamSet);

    // 3. Calculate Advanced Stats (OPR/DPR/CCWM)
    const computedStats = calculateEventStats(scoredMatches, teamList);

    // 4. Calculate Basic Stats (Win/Loss/Tie)
    const basicStats = {};
    teamList.forEach(t => basicStats[t] = { wins: 0, losses: 0, ties: 0 });

    scoredMatches.forEach(m => {
        const redScore = m.alliances.red.score;
        const blueScore = m.alliances.blue.score;

        let redResult = 'tie';
        if (redScore > blueScore) redResult = 'win';
        if (blueScore > redScore) redResult = 'loss';

        // Red teams
        m.alliances.red.team_objects.forEach(t => {
            if (redResult === 'win') basicStats[t.name].wins++;
            else if (redResult === 'loss') basicStats[t.name].losses++;
            else basicStats[t.name].ties++;
        });

        // Blue teams
        m.alliances.blue.team_objects.forEach(t => {
            if (redResult === 'loss') basicStats[t.name].wins++; // Blue wins if Red loses
            else if (redResult === 'win') basicStats[t.name].losses++;
            else basicStats[t.name].ties++;
        });
    });

    // 5. Save to Database
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if event exists, if not create it
        // We assume start_date is passed or we fetch event details? 
        // For now, let's just insert/ignore.
        await client.query(`
            INSERT INTO events (sku, processed, last_updated)
            VALUES ($1, true, CURRENT_TIMESTAMP)
            ON CONFLICT (sku) DO UPDATE SET processed = true, last_updated = CURRENT_TIMESTAMP
        `, [sku]);

        // Bulk upsert stats
        for (const team of teamList) {
            const comp = computedStats[team] || { opr: 0, dpr: 0, ccwm: 0 };
            const basic = basicStats[team];
            const totalMatches = basic.wins + basic.losses + basic.ties;
            const winRate = totalMatches > 0 ? (basic.wins / totalMatches) : 0;

            await client.query(`
                INSERT INTO team_event_stats 
                (team_number, sku, opr, dpr, ccwm, win_rate, wins, losses, ties)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (team_number, sku) DO UPDATE SET
                opr = EXCLUDED.opr,
                dpr = EXCLUDED.dpr,
                ccwm = EXCLUDED.ccwm,
                win_rate = EXCLUDED.win_rate,
                wins = EXCLUDED.wins,
                losses = EXCLUDED.losses,
                ties = EXCLUDED.ties
            `, [
                team, sku,
                comp.opr, comp.dpr, comp.ccwm,
                winRate, basic.wins, basic.losses, basic.ties
            ]);
        }

        await client.query('COMMIT');
        console.log(`Successfully processed event ${sku}: Stats saved for ${teamList.length} teams.`);
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

/**
 * Ensures a team's events are analyzed and cached
 */
export async function ensureTeamAnalysis(pool, teamNumber, apiKey, seasonId) {
    if (!apiKey) throw new Error("API Key required");

    // 1. Get Team ID (RobotEvents needs ID, not number, usually. But let's check if we can search by number)
    // Actually teams endpoint searches by number.
    const teams = await fetchAllPages(`${ROBOTEVENTS_BASE_URL}/teams?number=${teamNumber}`, apiKey);
    if (teams.length === 0) return;
    const teamId = teams[0].id;

    // 2. Get Team's Events for the Season
    const events = await fetchAllPages(`${ROBOTEVENTS_BASE_URL}/teams/${teamId}/events?season[]=${seasonId}`, apiKey);

    // 3. Filter for Past events
    const now = new Date();
    const pastEvents = events.filter(e => new Date(e.end) < now);

    // 4. Check which are missing in DB
    if (pastEvents.length === 0) return;

    const skuList = pastEvents.map(e => e.sku);
    // Query DB for these SKUs
    const placeholders = skuList.map((_, i) => `$${i + 1}`).join(',');
    const cachedResult = await pool.query(
        `SELECT sku FROM events WHERE sku IN (${placeholders}) AND processed = true`,
        skuList
    );
    const cachedSkus = new Set(cachedResult.rows.map(r => r.sku));

    // 5. Process missing events
    const missingEvents = pastEvents.filter(e => !cachedSkus.has(e.sku));

    console.log(`Team ${teamNumber}: Found ${pastEvents.length} past events, ${cachedSkus.size} cached. Processing ${missingEvents.length} new events.`);

    for (const event of missingEvents) {
        try {
            await processEvent(pool, event, apiKey);
        } catch (error) {
            console.error(`Failed to process event ${event.sku}:`, error.message);
            // Continue to next event even if one fails
        }
    }
}

/**
 * Get Composite Strength Score for a list of teams
 */
export async function getTeamPerformance(pool, teamNumbers, seasonId) {
    // 1. Get Avg OPR and Win Rate from DB
    // We aggregate stats from all events in the season
    const placeholders = teamNumbers.map((_, i) => `$${i + 1}`).join(',');

    // We need Max OPR for normalization. Let's assume a static max for now or query it.
    // Static Max OPR ~ 30 (high), Max Skills ~ 400 (Season dynamic)
    const MAX_OPR = 30; // Approximation
    const MAX_SKILLS = 400; // Approximation

    const query = `
        SELECT 
            t.team_number,
            AVG(t.opr) as avg_opr,
            AVG(t.win_rate) as avg_win_rate,
            MAX(s.score) as max_skills
        FROM team_event_stats t
        LEFT JOIN skills_standings s ON t.team_number = s.teamNumber
        WHERE t.team_number IN (${placeholders})
        GROUP BY t.team_number
    `;

    const result = await pool.query(query, teamNumbers);

    return result.rows.map(row => {
        const opr = parseFloat(row.avg_opr) || 0;
        const skills = parseInt(row.max_skills) || 0;
        const winRate = parseFloat(row.avg_win_rate) || 0;

        // Formula: 50% OPR + 30% Skills + 20% Win Rate
        // OPR Norm: (OPR / 30) * 50
        // Skills Norm: (Skills / 400) * 30
        // Win Rate Norm: WinRate * 20 (WinRate is 0-1) -> Wait, WinRate is 0.0-1.0. So 100% * 20 = 20. Correct.

        let normOpr = (opr / MAX_OPR) * 50;
        let normSkills = (skills / MAX_SKILLS) * 30;
        let normWinRate = winRate * 20;

        // Clamp values
        if (normOpr > 50) normOpr = 50;
        if (normSkills > 30) normSkills = 30;

        const strength = Math.round(normOpr + normSkills + normWinRate);

        // Tier
        let tier = 'Developing';
        if (strength >= 90) tier = 'Elite';
        else if (strength >= 75) tier = 'High';
        else if (strength >= 60) tier = 'Mid-High';
        else if (strength >= 40) tier = 'Mid';

        return {
            teamNumber: row.team_number,
            opr: opr.toFixed(2),
            winRate: (winRate * 100).toFixed(1) + '%',
            skills: skills,
            strength: strength,
            tier: tier
        };
    });
}

