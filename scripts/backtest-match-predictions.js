import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import pg from 'pg';
import { applyShrinkage, computeStrength } from '../src/api/services/perfScore.js';
import {
  currentRedWinProbability,
  evaluatePredictions,
} from '../src/api/services/predictionMetrics.js';
import { ROBOTEVENTS_API_BASE } from '../src/api/config/robotevents.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const args = Object.fromEntries(
  process.argv.slice(2).map(argument => {
    const [key, ...value] = argument.replace(/^--/, '').split('=');
    return [key, value.length > 0 ? value.join('=') : true];
  }),
);

const eventLimit = args.all ? Infinity : Number.parseInt(args.limit || '20', 10);
const minimumPriorEvents = Number.parseInt(args['min-prior-events'] || '3', 10);
const reportDate = new Date().toISOString().slice(0, 10);
const defaultOutput = `docs/prediction-backtest-${reportDate}.md`;
const outputPath = path.resolve(__dirname, '..', args.output || defaultOutput);
const SHRINKAGE_K = 5;

if (!process.env.ROBOTEVENTS_API_TOKEN) {
  throw new Error('ROBOTEVENTS_API_TOKEN is required');
}

function createPool() {
  const { Pool } = pg;
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('railway.internal')
        ? false
        : { rejectUnauthorized: false },
    });
  }

  return new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number.parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'vexscouting',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  });
}

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function fetchJson(url, attempt = 1) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.ROBOTEVENTS_API_TOKEN}`,
      Accept: 'application/json',
    },
  });

  if ((response.status === 429 || response.status >= 500) && attempt < 5) {
    const retryAfter = Number.parseInt(response.headers.get('retry-after') || '0', 10) * 1000;
    await delay(retryAfter || 1000 * 2 ** attempt);
    return fetchJson(url, attempt + 1);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`VEX Events API ${response.status} for ${url}: ${text.slice(0, 160)}`);
  }

  return response.json();
}

async function fetchAllPages(url) {
  const items = [];
  let page = 1;
  let lastPage = 1;

  do {
    const separator = url.includes('?') ? '&' : '?';
    const data = await fetchJson(`${url}${separator}page=${page}&per_page=250`);
    items.push(...(data.data || []));
    lastPage = data.meta?.last_page || 1;
    page += 1;
  } while (page <= lastPage);

  return items;
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function resolveEvents(skus) {
  const events = [];
  for (const group of chunks(skus, 40)) {
    const params = new URLSearchParams({ per_page: '250' });
    group.forEach(sku => params.append('sku[]', sku));
    const data = await fetchJson(`${ROBOTEVENTS_API_BASE}/events?${params}`);
    events.push(...(data.data || []));
  }
  return events;
}

function percentile(values, probability) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function buildStrengthMap(statsRows, trainingSkus, skillsByTeam) {
  const aggregates = new Map();

  for (const row of statsRows) {
    if (!trainingSkus.has(row.sku)) continue;
    const current = aggregates.get(row.team_number) || {
      n: 0,
      ccwm: 0,
      winRate: 0,
    };
    current.n += 1;
    current.ccwm += Number(row.ccwm) || 0;
    current.winRate += Number(row.win_rate) || 0;
    aggregates.set(row.team_number, current);
  }

  const perTeam = [...aggregates.entries()].map(([team, aggregate]) => ({
    team,
    n: aggregate.n,
    avgCcwm: aggregate.ccwm / aggregate.n,
    avgWinRate: aggregate.winRate / aggregate.n,
  }));

  if (perTeam.length === 0) return new Map();

  const populationCcwm = perTeam.reduce((sum, team) => sum + team.avgCcwm, 0) / perTeam.length;
  const populationWinRate = perTeam.reduce((sum, team) => sum + team.avgWinRate, 0) / perTeam.length;
  const maximumCcwm = percentile(perTeam.map(team => team.avgCcwm), 0.99) || 1;
  const maximumSkills = percentile([...skillsByTeam.values()], 0.99) || 1;
  const strengths = new Map();

  for (const team of perTeam) {
    const ccwmShrunk = applyShrinkage({
      n: team.n,
      observed: team.avgCcwm,
      populationMean: populationCcwm,
      k: SHRINKAGE_K,
    });
    const winRateShrunk = applyShrinkage({
      n: team.n,
      observed: team.avgWinRate,
      populationMean: populationWinRate,
      k: SHRINKAGE_K,
    });
    strengths.set(team.team, computeStrength({
      ccwmShrunk,
      maxCcwm: maximumCcwm,
      maxSkills: skillsByTeam.get(team.team) || 0,
      maxSkillsCap: maximumSkills,
      winRateShrunk,
    }));
  }

  return strengths;
}

function selectEvents(events, limit) {
  if (!Number.isFinite(limit) || events.length <= limit) return events;
  if (limit <= 0) return [];

  const selected = [];
  for (let index = 0; index < limit; index += 1) {
    const position = Math.round(index * (events.length - 1) / Math.max(1, limit - 1));
    selected.push(events[position]);
  }
  return [...new Map(selected.map(event => [event.sku, event])).values()];
}

function allianceTeams(alliance) {
  return (alliance?.teams || [])
    .filter(team => !team.sitting)
    .map(team => team.team?.name)
    .filter(Boolean);
}

function isScoredMatch(match, red, blue) {
  if (!red || !blue) return false;
  if (!Number.isFinite(red.score) || !Number.isFinite(blue.score)) return false;
  return Boolean(match.scored || match.started || red.score !== 0 || blue.score !== 0);
}

function eventLevel(event) {
  if (typeof event.level === 'string') return event.level;
  return event.level?.name || event.event_type?.name || 'Unknown';
}

function percent(value) {
  return value === null || value === undefined ? 'n/a' : `${(value * 100).toFixed(1)}%`;
}

function decimal(value) {
  return value === null || value === undefined ? 'n/a' : value.toFixed(4);
}

function renderReport({
  events,
  resolvedEventCount,
  eventRows,
  predictions,
  ties,
  malformed,
  missingSlots,
  totalSlots,
}) {
  const metrics = evaluatePredictions(predictions);
  const fullyCoveredMetrics = evaluatePredictions(
    predictions.filter(prediction => prediction.missingSlots === 0),
  );
  const extremePredictionCount = predictions.filter(
    prediction => prediction.probability === 0 || prediction.probability === 1,
  ).length;
  const byLevel = new Map();
  predictions.forEach(prediction => {
    const group = byLevel.get(prediction.level) || [];
    group.push(prediction);
    byLevel.set(prediction.level, group);
  });

  let markdown = `# Match Prediction Backtest - ${reportDate}\n\n`;
  markdown += `## Result\n\n`;
  markdown += `| Metric | Value |\n|---|---:|\n`;
  markdown += `| Events evaluated | ${events.length} |\n`;
  markdown += `| Non-tied scored matches | ${metrics.count} |\n`;
  markdown += `| Accuracy | ${percent(metrics.accuracy)} |\n`;
  markdown += `| Brier score | ${decimal(metrics.brierScore)} |\n`;
  markdown += `| Constant base-rate Brier score | ${decimal(metrics.baselineBrierScore)} |\n`;
  markdown += `| Red win base rate | ${percent(metrics.baseRate)} |\n`;
  markdown += `| Fully covered matches | ${fullyCoveredMetrics.count} |\n`;
  markdown += `| Fully covered accuracy | ${percent(fullyCoveredMetrics.accuracy)} |\n`;
  markdown += `| Fully covered Brier score | ${decimal(fullyCoveredMetrics.brierScore)} |\n`;
  markdown += `| Fully covered baseline Brier | ${decimal(fullyCoveredMetrics.baselineBrierScore)} |\n`;
  markdown += `| Missing strength slots | ${missingSlots} / ${totalSlots} (${totalSlots ? percent(missingSlots / totalSlots) : 'n/a'}) |\n`;
  markdown += `| Exact 0% or 100% predictions | ${extremePredictionCount} (${percent(extremePredictionCount / metrics.count)}) |\n`;
  markdown += `| Tied matches excluded | ${ties} |\n`;
  markdown += `| Malformed/unscored matches excluded | ${malformed} |\n\n`;

  markdown += `Lower Brier score is better. The constant base-rate score is the reference that always predicts the observed red-alliance win rate.\n\n`;
  markdown += `## Method\n\n`;
  markdown += `- Resolved ${resolvedEventCount} processed database events against the VEX Events API and ordered them by start date.\n`;
  markdown += `- Evaluated a deterministic spread of up to ${Number.isFinite(eventLimit) ? eventLimit : 'all'} eligible events.\n`;
  markdown += `- For each target event, team strength was calculated only from database event aggregates whose resolved event start date was earlier than the target event.\n`;
  markdown += `- Required at least ${minimumPriorEvents} earlier processed events before evaluating a target event.\n`;
  markdown += `- The probability rule mirrors the current UI: average known team strengths on each alliance, then compute red / (red + blue). Missing teams are omitted from the average; if neither alliance has strength, probability is 50%.\n`;
  markdown += `- Sitting teams were excluded. Ties were excluded from binary Brier score and accuracy.\n\n`;

  markdown += `## Important Limitations\n\n`;
  markdown += `- Skills scores are current season-final values because historical skill snapshots are not stored. This leaks future information and can make results optimistic.\n`;
  markdown += `- The database contains only events previously selected for analysis, not every event in the season. Earlier-event training coverage is therefore incomplete and selection-biased.\n`;
  markdown += `- The current UI text says missing teams are counted as zero, but the implementation omits them from the alliance average. This can produce exact 0%/100% predictions when only one alliance has known strength. The backtest mirrors the implementation.\n`;
  markdown += `- Event aggregates are used for training; private scouting observations and within-event updates are not modeled.\n`;
  markdown += `- This report is a baseline risk assessment, not evidence that displayed percentages are calibrated enough for a paid accuracy claim.\n\n`;

  markdown += `## Calibration\n\n`;
  markdown += `| Predicted red range | Matches | Mean prediction | Observed red win rate | Gap |\n|---|---:|---:|---:|---:|\n`;
  metrics.calibration.forEach(bucket => {
    const label = `${Math.round(bucket.lower * 100)}-${Math.round(bucket.upper * 100)}%`;
    const gap = bucket.count > 0 ? bucket.observedRate - bucket.meanProbability : null;
    markdown += `| ${label} | ${bucket.count} | ${percent(bucket.meanProbability)} | ${percent(bucket.observedRate)} | ${gap === null ? 'n/a' : `${(gap * 100).toFixed(1)} pp`} |\n`;
  });

  markdown += `\n## By Event Level\n\n`;
  markdown += `| Level | Matches | Accuracy | Brier | Baseline Brier |\n|---|---:|---:|---:|---:|\n`;
  [...byLevel.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([level, rows]) => {
    const result = evaluatePredictions(rows);
    markdown += `| ${level} | ${result.count} | ${percent(result.accuracy)} | ${decimal(result.brierScore)} | ${decimal(result.baselineBrierScore)} |\n`;
  });

  markdown += `\n## Event Sample\n\n`;
  markdown += `| Date | SKU | Event | Level | Prior events | Matches | Missing slots |\n|---|---|---|---|---:|---:|---:|\n`;
  eventRows.forEach(row => {
    markdown += `| ${row.start.slice(0, 10)} | ${row.sku} | ${row.name.replaceAll('|', '\\|')} | ${row.level} | ${row.priorEvents} | ${row.matches} | ${row.missingSlots}/${row.totalSlots} |\n`;
  });

  markdown += `\n## Decision\n\n`;
  if (metrics.brierScore !== null && metrics.brierScore < metrics.baselineBrierScore) {
    markdown += `The current score-ratio model beats the constant base-rate Brier baseline on this sample, but the limitations above prevent a paid calibration claim. Preserve it as a provisional ranking signal and build time-correct skill snapshots before model replacement.\n`;
  } else {
    markdown += `The current score-ratio model does not beat the constant base-rate Brier baseline on this sample. Do not market the displayed percentage as predictive accuracy; prioritize data capture and model calibration before making it a paid promise.\n`;
  }

  return markdown;
}

async function main() {
  const pool = createPool();
  try {
    const [eventResult, statsResult, skillsResult] = await Promise.all([
      pool.query(`SELECT sku FROM events WHERE processed = true AND sku LIKE 'RE-V5RC-%' ORDER BY sku`),
      pool.query(`SELECT team_number, sku, ccwm, win_rate FROM team_event_stats`),
      pool.query(`SELECT teamnumber, score FROM skills_standings WHERE matchtype = 'VRC'`),
    ]);

    const databaseSkus = eventResult.rows.map(row => row.sku);
    console.log(`Resolving ${databaseSkus.length} processed events...`);
    const resolvedEvents = await resolveEvents(databaseSkus);
    const eventBySku = new Map(resolvedEvents.map(event => [event.sku, event]));
    const chronologicalEvents = databaseSkus
      .map(sku => eventBySku.get(sku))
      .filter(event => event?.start)
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    const skillsByTeam = new Map(
      skillsResult.rows.map(row => [row.teamnumber, Number(row.score) || 0]),
    );
    const eligibleEvents = chronologicalEvents.filter((event, index) => index >= minimumPriorEvents);
    const targetEvents = selectEvents(eligibleEvents, eventLimit);
    const predictions = [];
    const eventRows = [];
    let ties = 0;
    let malformed = 0;
    let missingSlots = 0;
    let totalSlots = 0;

    for (const [index, event] of targetEvents.entries()) {
      const eventStart = new Date(event.start);
      const priorEvents = chronologicalEvents.filter(candidate => new Date(candidate.start) < eventStart);
      const trainingSkus = new Set(priorEvents.map(candidate => candidate.sku));
      const strengthByTeam = buildStrengthMap(statsResult.rows, trainingSkus, skillsByTeam);
      let matches = [];

      for (const division of event.divisions || []) {
        const divisionMatches = await fetchAllPages(
          `${ROBOTEVENTS_API_BASE}/events/${event.id}/divisions/${division.id}/matches`,
        );
        matches.push(...divisionMatches);
      }

      let eventMatchCount = 0;
      let eventMissingSlots = 0;
      let eventTotalSlots = 0;

      for (const match of matches) {
        const red = match.alliances?.find(alliance => alliance.color === 'red');
        const blue = match.alliances?.find(alliance => alliance.color === 'blue');
        if (!isScoredMatch(match, red, blue)) {
          malformed += 1;
          continue;
        }
        if (red.score === blue.score) {
          ties += 1;
          continue;
        }

        const redTeams = allianceTeams(red);
        const blueTeams = allianceTeams(blue);
        if (redTeams.length === 0 || blueTeams.length === 0) {
          malformed += 1;
          continue;
        }

        const teams = [...redTeams, ...blueTeams];
        const matchMissing = teams.filter(team => !strengthByTeam.has(team)).length;
        missingSlots += matchMissing;
        totalSlots += teams.length;
        eventMissingSlots += matchMissing;
        eventTotalSlots += teams.length;

        predictions.push({
          probability: currentRedWinProbability(redTeams, blueTeams, strengthByTeam),
          outcome: red.score > blue.score ? 1 : 0,
          missingSlots: matchMissing,
          level: eventLevel(event),
          sku: event.sku,
        });
        eventMatchCount += 1;
      }

      eventRows.push({
        start: event.start,
        sku: event.sku,
        name: event.name,
        level: eventLevel(event),
        priorEvents: priorEvents.length,
        matches: eventMatchCount,
        missingSlots: eventMissingSlots,
        totalSlots: eventTotalSlots,
      });
      console.log(`[${index + 1}/${targetEvents.length}] ${event.sku}: ${eventMatchCount} matches`);
    }

    const markdown = renderReport({
      events: targetEvents,
      resolvedEventCount: chronologicalEvents.length,
      eventRows,
      predictions,
      ties,
      malformed,
      missingSlots,
      totalSlots,
    });
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, markdown);
    console.log(`Report written to ${path.relative(process.cwd(), outputPath)}`);
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
