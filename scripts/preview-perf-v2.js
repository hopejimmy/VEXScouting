// Offline preview of Performance Score v2 distribution.
//
// Run locally against a DB containing processed events (read-only):
//
//   set -a; source .env; set +a
//   node scripts/preview-perf-v2.js --season=197
//
// Outputs a markdown report under docs/.
//
// The v2 formula is duplicated inline (not imported) so the preview
// stays frozen against the spec-as-of-today even if analysis.js drifts.
//
// Schema notes (current state):
// - events.seasonid is not populated by the ingest pipeline, so we filter
//   VRC events by SKU prefix `RE-V5RC-%`. Single-season data only at the
//   moment, so the season parameter is currently unused in the WHERE.
// - Postgres column casing is lowercase (no quoting): teamnumber, matchtype,
//   score, team_number, ccwm, win_rate, opr, sku.

import 'dotenv/config';
import pg from 'pg';
import { writeFileSync, mkdirSync } from 'fs';

const { Pool } = pg;

const args = Object.fromEntries(
  process.argv.slice(2).map(a => a.replace(/^--/, '').split('='))
);
const seasonId = parseInt(args.season || process.env.SEASON_ID || '197');
const SHRINKAGE_K = 5;

async function main() {
  const pool = new Pool(
    process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: process.env.POSTGRES_HOST,
          port: parseInt(process.env.POSTGRES_PORT) || 5432,
          database: process.env.POSTGRES_DB,
          user: process.env.POSTGRES_USER,
          password: process.env.POSTGRES_PASSWORD,
        }
  );

  // Pull every VRC team that has any team_event_stats from a VRC SKU.
  // Same CTE structure as getTeamPerformanceV2 in analysis.js — kept
  // duplicated intentionally so the preview is frozen.
  const { rows } = await pool.query(`
    WITH season_events AS (
      SELECT sku FROM events WHERE sku LIKE 'RE-V5RC-%'
    ),
    per_team_avg AS (
      SELECT t.team_number,
             COUNT(*) AS n,
             AVG(t.ccwm) AS avg_ccwm,
             AVG(t.opr)  AS avg_opr,
             AVG(t.win_rate) AS avg_win_rate
      FROM team_event_stats t
      JOIN season_events se ON t.sku = se.sku
      GROUP BY t.team_number
    ),
    season_pop AS (
      SELECT AVG(avg_ccwm) AS pop_ccwm, AVG(avg_win_rate) AS pop_win_rate,
             percentile_cont(0.99) WITHIN GROUP (ORDER BY avg_ccwm) AS max_ccwm
      FROM per_team_avg
    ),
    skills_pop AS (
      SELECT percentile_cont(0.99) WITHIN GROUP (ORDER BY score) AS max_skills_cap
      FROM skills_standings WHERE matchtype = 'VRC'
    )
    SELECT pta.*,
      (SELECT MAX(score) FROM skills_standings s
        WHERE s.teamnumber = pta.team_number AND s.matchtype = 'VRC') AS max_skills,
      sp.pop_ccwm, sp.pop_win_rate, sp.max_ccwm,
      skp.max_skills_cap
    FROM per_team_avg pta
    CROSS JOIN season_pop sp
    CROSS JOIN skills_pop skp;
  `);

  const clamp01 = x => Math.max(0, Math.min(1, x));
  const safeRatio = (n, d) => (d > 0 ? n / d : 0);

  const teams = rows.map(r => {
    const n = parseInt(r.n) || 0;
    const avgCcwm = parseFloat(r.avg_ccwm) || 0;
    const avgOpr = parseFloat(r.avg_opr) || 0;
    const avgWr = parseFloat(r.avg_win_rate) || 0;
    const skills = parseInt(r.max_skills) || 0;
    const popCcwm = parseFloat(r.pop_ccwm) || 0;
    const popWr = parseFloat(r.pop_win_rate) || 0;
    const maxCcwm = parseFloat(r.max_ccwm) || 1;
    const maxSkillsCap = parseFloat(r.max_skills_cap) || 1;

    const ccwmShrunk = (n * avgCcwm + SHRINKAGE_K * popCcwm) / (n + SHRINKAGE_K);
    const wrShrunk = (n * avgWr + SHRINKAGE_K * popWr) / (n + SHRINKAGE_K);

    const newScore = Math.round(
      clamp01(safeRatio(ccwmShrunk, maxCcwm)) * 50 +
      clamp01(safeRatio(skills, maxSkillsCap)) * 25 +
      clamp01(wrShrunk) * 25
    );

    // Legacy formula for comparison: 40% OPR + 60% Win Rate
    const legacyScore = Math.round(
      Math.min(40, (avgOpr / 30) * 40) + avgWr * 60
    );

    return { team: r.team_number, n, avgCcwm, avgOpr, avgWr, skills, newScore, legacyScore };
  }).sort((a, b) => b.newScore - a.newScore);

  // Distribution histogram (5-point buckets)
  const buckets = {};
  teams.forEach(t => {
    const b = Math.floor(t.newScore / 5) * 5;
    buckets[b] = (buckets[b] || 0) + 1;
  });

  // Recommended thresholds for 5/15/25/30/25 pyramid
  const sorted = teams.map(t => t.newScore).sort((a, b) => b - a);
  const at = pct => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * pct))];
  const recommended = {
    ELITE:    at(0.05),
    HIGH:     at(0.20),
    MID_HIGH: at(0.45),
    MID:      at(0.75),
  };

  // Old-vs-new biggest movers
  const movers = [...teams]
    .map(t => ({ ...t, delta: t.newScore - t.legacyScore }))
    .sort((a, b) => b.delta - a.delta);
  const risers = movers.slice(0, 10);
  const fallers = movers.slice(-10).reverse();

  // Markdown
  const date = new Date().toISOString().slice(0, 10);
  let md = `# Performance v2 Preview — Season ${seasonId} — ${date}\n\n`;
  md += `Total VRC teams scored: **${teams.length}**\n\n`;

  md += `## Score distribution (5-point buckets)\n\n\`\`\`\n`;
  Object.keys(buckets).map(Number).sort((a, b) => a - b).forEach(b => {
    md += `${String(b).padStart(3)}-${b + 4} | ${'█'.repeat(Math.min(80, buckets[b]))} (${buckets[b]})\n`;
  });
  md += `\`\`\`\n\n`;

  md += `## Recommended tier thresholds\n\n`;
  md += `Set in \`src/api/services/perfScore.js\` → \`TIER_THRESHOLDS\`:\n\n`;
  md += `\`\`\`js\nexport const TIER_THRESHOLDS = {\n`;
  md += `  ELITE: ${recommended.ELITE},     // top  ~5%\n`;
  md += `  HIGH: ${recommended.HIGH},       // next ~15%\n`;
  md += `  MID_HIGH: ${recommended.MID_HIGH},   // next ~25%\n`;
  md += `  MID: ${recommended.MID},         // next ~30%\n`;
  md += `};\n\`\`\`\n\n`;

  md += `## Top 30 teams (by v2 score)\n\n`;
  md += `| Rank | Team | n | New | Legacy | Δ |\n|---|---|---|---|---|---|\n`;
  teams.slice(0, 30).forEach((t, i) => {
    const d = t.newScore - t.legacyScore;
    md += `| ${i + 1} | ${t.team} | ${t.n} | ${t.newScore} | ${t.legacyScore} | ${d >= 0 ? '+' : ''}${d} |\n`;
  });

  md += `\n## Top 10 risers (legacy → v2)\n\n`;
  md += `| Team | n | Legacy | New | Δ |\n|---|---|---|---|---|\n`;
  risers.forEach(t => {
    md += `| ${t.team} | ${t.n} | ${t.legacyScore} | ${t.newScore} | +${t.delta} |\n`;
  });

  md += `\n## Top 10 fallers (legacy → v2)\n\n`;
  md += `| Team | n | Legacy | New | Δ |\n|---|---|---|---|---|\n`;
  fallers.forEach(t => {
    md += `| ${t.team} | ${t.n} | ${t.legacyScore} | ${t.newScore} | ${t.delta} |\n`;
  });

  md += `\n## Sanity check — known-strong teams\n\n`;
  md += `Edit this section to include teams you know should rank in the top tier\n`;
  md += `(Worlds finalists, top seeds for this season). If they don't appear high\n`;
  md += `in the top-30 table above, something is off.\n`;

  mkdirSync('docs', { recursive: true });
  const outPath = `docs/perf-v2-preview-${seasonId}-${date}.md`;
  writeFileSync(outPath, md);
  console.log(`Wrote ${outPath}`);
  console.log(`\nRecommended thresholds for TIER_THRESHOLDS:`);
  console.log(JSON.stringify(recommended, null, 2));

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
