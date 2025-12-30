import { EventEmitter } from 'events';
import { ensureTeamAnalysis } from './analysis.js';

class AnalysisWorker extends EventEmitter {
    constructor() {
        super();
        this.isRunning = false;
        this.shouldStop = false;
        this.currentTeam = null;
        this.progress = { current: 0, total: 0 };
    }

    /**
     * Start processing the list of tracked teams
     * @param {Pool} pool Postgres Connection Pool
     * @param {string} apiToken RobotEvents API Token
     * @param {number} seasonId Season ID
     */
    async start(pool, apiToken, seasonId, force = false) {
        if (this.isRunning) {
            return false; // Already running
        }

        this.isRunning = true;
        this.shouldStop = false;
        this.force = force;
        this.emit('log', { type: 'info', message: `🚀 Starting Analysis Worker... (Force Refresh: ${force})` });

        try {
            // 1. Fetch tracked teams
            const client = await pool.connect();
            const res = await client.query('SELECT team_number FROM tracked_teams ORDER BY created_at DESC');
            client.release();

            const teams = res.rows.map(r => r.team_number);
            this.progress.total = teams.length;
            this.progress.current = 0;

            if (teams.length === 0) {
                this.emit('log', { type: 'warn', message: 'ℹ️ No tracked teams found.' });
                this.stop();
                return;
            }

            this.emit('log', { type: 'info', message: `📋 Found ${teams.length} teams to process.` });

            // 2. Process Loop
            for (let i = 0; i < teams.length; i++) {
                if (this.shouldStop) {
                    this.emit('log', { type: 'info', message: '⏳ Stopping after current team...' });
                    break;
                }

                const teamNumber = teams[i];
                this.currentTeam = teamNumber;
                this.progress.current = i + 1;

                this.emit('log', {
                    type: 'process',
                    message: `[${i + 1}/${teams.length}] Analyzing Team ${teamNumber}...`
                });

                const startTime = Date.now();

                try {
                    // Pass a custom logger that emits events back to this worker
                    await ensureTeamAnalysis(pool, teamNumber, apiToken, seasonId, (msg) => {
                        this.emit('log', { type: 'debug', message: `  > ${msg}` });
                    }, this.force);

                    this.emit('log', { type: 'success', message: `✅ Team ${teamNumber} processed.` });

                } catch (err) {
                    this.emit('log', { type: 'error', message: `❌ Failed ${teamNumber}: ${err.message}` });
                    if (err.message.includes('429')) {
                        this.emit('log', { type: 'warn', message: '⚠️ Rate Limited! Pausing 60s...' });
                        await new Promise(r => setTimeout(r, 60000));
                    }
                }

                // Enforce a mandatory cooldown between teams to let rate limits cool off
                // Even if fetching took a long time, we should still pause briefly.
                this.emit('log', { type: 'debug', message: '  zzz Cooling down (2s)...' });
                await new Promise(r => setTimeout(r, 2000));
            }

            this.emit('log', { type: 'complete', message: '🎉 Analysis Complete!' });

        } catch (error) {
            this.emit('log', { type: 'error', message: `🔥 Fatal Error: ${error.message}` });
        } finally {
            this.stop();
        }
    }

    stop() {
        this.isRunning = false;
        this.shouldStop = false;
        this.currentTeam = null;
        this.emit('log', { type: 'stop', message: '⏹️ Analysis Stopped.' });
        this.emit('status', { running: false });
    }

    requestStop() {
        if (this.isRunning) {
            this.shouldStop = true;
            this.emit('log', { type: 'info', message: '⏳ Stopping request received...' });
        }
    }
}

// Singleton Instance
export const analysisWorker = new AnalysisWorker();
