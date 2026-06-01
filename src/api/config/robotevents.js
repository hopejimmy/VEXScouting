// VEX competition data API (formerly the RECF-run "RobotEvents" API).
//
// After the May 2026 VEX/RECF split, www.robotevents.com stopped serving VEX
// data and now bounces API calls to an HTML login page. All endpoints moved to
// events.vex.com with identical paths. Override the origin via the
// ROBOTEVENTS_API_ORIGIN env var if the platform ever moves again — no code
// change needed.
export const ROBOTEVENTS_ORIGIN =
  process.env.ROBOTEVENTS_API_ORIGIN || 'https://events.vex.com';

// Base for the v2 REST API (teams, events, seasons, rankings, matches, awards).
export const ROBOTEVENTS_API_BASE = `${ROBOTEVENTS_ORIGIN}/api/v2`;

/**
 * Read a fetch() Response as JSON, throwing a clear error when the API returns
 * a redirect or HTML page instead of JSON (e.g. an auth bounce to /auth/login
 * when the token is invalid or the origin is wrong).
 *
 * Without this guard, such responses reach response.json() and surface as the
 * opaque "Unexpected token < in JSON at position 0" — a 500 that gives no hint
 * the real cause is an auth/origin problem.
 */
export async function readRobotEventsJson(response, context = 'VEX API') {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const snippet = (await response.text()).slice(0, 120).replace(/\s+/g, ' ');
    throw new Error(
      `${context}: expected JSON but got ${response.status} ${contentType || 'no content-type'} — ` +
      `likely an auth redirect. Check ROBOTEVENTS_API_TOKEN / ROBOTEVENTS_API_ORIGIN. Body: ${snippet}`
    );
  }
  return response.json();
}
