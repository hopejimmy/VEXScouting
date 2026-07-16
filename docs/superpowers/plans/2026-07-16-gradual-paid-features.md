# Gradual Paid Features Implementation Plan

> **Status:** Approved product direction; implementation not started.
> **Created:** 2026-07-16
> **Last updated:** 2026-07-16
> **Progress:** Phase 0 of 7 in progress; 5 of 9 Phase 0 checklist items completed. External interviews, pilot recruitment, and written API clarification remain.

## Resume Here

This document is the source of truth for turning VEXScouting into a paid product. A future developer or AI agent should:

1. Read this document before changing product or billing behavior. If the uncommitted `docs/BUSINESS_PLAN.md` is present, read it as additional strategy context.
2. Check `git status` and preserve unrelated user changes.
3. Find the first unchecked task in the current phase. Do not skip a phase's exit gate.
4. Update the checkboxes, progress summary, decision log, and last-updated date after each completed task.
5. Record validation evidence in this file or a linked report before advancing phases.

Do not start Stripe subscription automation until the Phase 4 revenue gate is met. Do not treat free pilot usage, survey interest, or waitlist signups as payment validation.

## Goal

Build a coach-focused, multi-team competition workspace that earns recurring seasonal revenue. Public RobotEvents-derived data remains free; organizations pay for private data, collaboration, decision workflows, history, and administration.

The target workflow is:

```text
Choose event
  -> invite and assign scouts
  -> collect private observations
  -> review upcoming teams and public metrics
  -> build a collaborative alliance pick list
  -> export/share the decision
  -> retain history for the next event
```

## Fixed Product Decisions

- The initial buyer is a coach, mentor, or multi-team program coordinator, not an individual student.
- The initial pricing unit is a program per season, not a user per month.
- Three to five design-partner programs receive free access for one real competition in return for onboarding, real usage, and a feedback interview.
- The first paid offer is one `founding` plan at approximately USD `$19-39` per program per season.
- Early founding payments are collected manually with a payment link or invoice.
- Full Stripe subscription automation is deferred until at least 10 programs have paid.
- Public search, profiles, rankings, awards, schedules, and basic comparison remain free.
- Paid value comes from private shared scouting, event workspaces, assignments, pick lists, exports, history, and multi-team controls.
- Expired or canceled organizations become read-only. Existing data remains viewable and exportable.
- Prediction quality supports the product but is not the sole paid value proposition.

Any change to these decisions must be recorded in the Decision Log with evidence from customer usage or payments.

## Current Repository Baseline

The application currently provides:

- Public team search, profiles, skills, awards, events, rankings, comparison, and match pages.
- VRC performance scoring and match predictions.
- JWT login with global roles and permissions.
- Admin-created users and admin management pages.
- Browser-local favorites and comparisons.
- Express/PostgreSQL backend in `src/api/server.js` and Next.js frontend in `frontend-nextjs`.

Important gaps:

- There is no public registration, password reset, or email verification.
- There is no organization, team ownership, membership, or invitation model.
- Roles are global (`admin` and `guest`), not scoped to an organization.
- Favorites are stored in `localStorage`; there is no private server-side customer data.
- There are no scouting entries, assignments, pick lists, entitlements, subscriptions, or billing webhooks.
- There is no product analytics funnel for activation, event use, or retention.
- The current win probability formula is explicitly uncalibrated.
- Automated test coverage is limited to the performance-score helper.
- Database schema creation is partly embedded in `src/api/server.js`; customer-facing schema additions should use versioned SQL migrations.

## Free and Paid Entitlements

| Capability | Anonymous / Free | Pilot / Founding |
|---|---|---|
| Public team search and profiles | Yes | Yes |
| Public rankings, awards, and schedules | Yes | Yes |
| Basic comparison | Yes | Yes |
| Local favorites | Yes | Yes |
| Personal event workspace | Optional, at most one | Yes |
| Private structured scouting entries | No or one-event trial | Yes |
| Shared organization workspace | No | Yes |
| Member invitations and scout assignments | No | Yes |
| Collaborative alliance pick list | No | Yes |
| PDF/CSV decision reports | No | Yes |
| Cross-event private history | No | Yes |
| Multiple managed teams | No | Yes |

Exact free limits are deliberately unresolved until pilot usage shows which capability creates activation without eliminating the reason to pay.

## Proposed Domain Model

Use a versioned migration such as `src/utils/migrations/002_add_organization_workspaces.sql`. Do not store these tables only in the `initializeDatabase()` startup block.

```text
users
  id, username, email, password_hash, active, timestamps

organizations
  id, name, slug, owner_user_id
  plan: pilot | free | founding | team | program
  entitlement_status: active | grace | read_only
  access_expires_at, member_limit, event_limit, timestamps

organization_members
  organization_id, user_id
  role: owner | coach | scout
  status: invited | active | removed
  invited_by, joined_at, timestamps

organization_invitations
  id, organization_id, email, role
  token_hash, expires_at, accepted_at, invited_by, timestamps

managed_teams
  id, organization_id, team_number, match_type, display_name, timestamps
  unique (organization_id, team_number, match_type)

event_workspaces
  id, organization_id, event_id, division_id, name, status, timestamps
  unique (organization_id, event_id, division_id)

scouting_entries
  id, workspace_id, observed_team_number, observed_match_type
  match_number, reliability, driver_skill, defense, autonomous_quality
  penalty_risk, tags JSONB, notes, author_user_id, timestamps

scout_assignments
  id, workspace_id, assigned_user_id
  team_number, match_number, status, assigned_by, timestamps

pick_lists
  id, workspace_id, name, created_by, timestamps

pick_list_items
  id, pick_list_id, team_number, match_type, position
  status: available | picked | declined | do_not_pick
  private_note, timestamps
  unique (pick_list_id, team_number, match_type)

subscriptions                        # Phase 6 only
  id, organization_id, provider
  provider_customer_id, provider_subscription_id
  plan, status, current_period_end, timestamps

billing_events                       # Phase 6 only
  provider_event_id, event_type, processed_at, payload_hash
```

Keep student data collection minimal. Do not collect age, birth date, phone number, home address, or other unnecessary personal information. Customer-created notes are private to the organization by default.

## Authorization Model

Global roles continue to protect platform administration. Organization roles protect customer data.

| Action | Owner | Coach | Scout |
|---|---:|---:|---:|
| Manage billing and organization | Yes | No | No |
| Invite/remove members | Yes | Yes | No |
| Add managed teams and events | Yes | Yes | No |
| Create assignments | Yes | Yes | No |
| Add/edit own scouting entries | Yes | Yes | Yes |
| Edit another member's entry | Yes | Yes | No |
| Build/reorder pick lists | Yes | Yes | Configurable |
| Export organization data | Yes | Yes | No |

Every organization-scoped backend query must include an authorized `organization_id`. Never authorize access from an organization ID supplied by the browser without verifying membership on the server.

## Phase 0: Validate the Offer and Product Risk

**Purpose:** Confirm the buyer, workflow, and prediction risk before substantial implementation.

- [x] Write a one-page design-partner offer: free through one real event in exchange for onboarding, event usage, and a 20-minute debrief. See `docs/business/phase-0-design-partner-offer.md`.
- [x] Prepare a clickable walkthrough or use the existing product to demonstrate public analytics and the proposed private workflow. See `docs/business/phase-0-demo-walkthrough.md`.
- [ ] Interview at least 10 coaches or program coordinators; record their current scouting workflow, event frequency, number of teams/scouts, biggest failure, buyer, and budget source.
- [ ] Recruit 3-5 named design-partner programs with upcoming competition dates.
- [ ] Record the event date, team count, member count, and pilot owner for every partner.
- [x] Define the initial analytics events listed under Observability. See `docs/business/phase-0-analytics-spec.md`.
- [x] Backtest the current match prediction against historical completed matches. Run `npm run backtest:predictions`; implementation is in `scripts/backtest-match-predictions.js`.
- [x] Report accuracy, Brier score, calibration by probability bucket, missing-data rate, and sample size. See `docs/prediction-backtest-2026-07-16.md`.
- [ ] Confirm in writing whether commercial use of RobotEvents API data is permitted, or document an accepted commercial-use interpretation and contingency.

**Exit gate:** At least three programs commit to use the product during a named event. Prediction limitations and data-use risk are documented. If this gate fails, revise the offer before implementing Phase 1.

### Phase 0 Evidence So Far

- Outreach-ready offer and short message: `docs/business/phase-0-design-partner-offer.md`
- Interview guide, record, pilot tracker, and recruitment gate: `docs/business/phase-0-discovery-kit.md`
- Honest live/proposed demo script: `docs/business/phase-0-demo-walkthrough.md`
- Analytics event and funnel contract: `docs/business/phase-0-analytics-spec.md`
- API clarification request and contingency: `docs/business/vex-events-commercial-use-request.md`
- Repeatable tested prediction metrics: `src/api/services/predictionMetrics.js`
- Chronological backtest CLI: `scripts/backtest-match-predictions.js`
- Initial 20-event report: `docs/prediction-backtest-2026-07-16.md`

The initial backtest evaluated 1,480 non-tied matches. Overall accuracy was 63.0%, but the Brier score was 0.2551 versus 0.2490 for a constant base-rate predictor, so the displayed probability did not beat the trivial calibration baseline. Only 220 matches had complete prior strength coverage; those achieved 79.1% accuracy and a 0.2071 Brier score. Missing prior strength affected 63.3% of team slots and caused 31.8% of predictions to be exactly 0% or 100%. Do not sell the current percentage as an accuracy promise.

## Phase 1: Customer Identity and Organization Foundation

**Purpose:** Let a coach create and securely own a private program workspace.

### Backend

- [ ] Add a versioned SQL migration for organizations, members, invitations, managed teams, and entitlement columns.
- [ ] Add migration verification and rollback instructions.
- [ ] Extract customer authentication and organization routes from `src/api/server.js` into focused route/service modules without unrelated refactoring.
- [ ] Add public registration with normalized, unique email and secure password validation.
- [ ] Add email verification and password-reset token flows. Store only token hashes with expirations.
- [ ] Add `GET/POST/PATCH /api/organizations` endpoints.
- [ ] Add membership and invitation endpoints with expiry, single-use acceptance, and role enforcement.
- [ ] Add managed-team endpoints scoped by organization.
- [ ] Add reusable `requireOrganizationRole()` and `requireEntitlement()` middleware.
- [ ] Add integration tests for cross-organization access denial, expired invitations, duplicate acceptance, and role restrictions.

### Frontend

- [ ] Add registration, verification, forgot-password, and reset-password screens.
- [ ] Add organization onboarding: program name, managed team numbers, and first event optional.
- [ ] Add organization switcher only if pilots actually require users to belong to multiple organizations.
- [ ] Add member invitation and managed-team settings for owners/coaches.
- [ ] Update auth state to include current organization and organization role.

**Exit gate:** A new coach can register, verify their email, create an organization, add teams, invite a scout, and remain isolated from every other organization's data.

## Phase 2: Event Workspace MVP

**Purpose:** Complete the smallest real event-day workflow.

### Backend

- [ ] Add versioned migrations for event workspaces, scouting entries, scout assignments, pick lists, and pick-list items.
- [ ] Add organization-scoped CRUD endpoints for event workspaces.
- [ ] Reuse existing RobotEvents event/team endpoints to seed a workspace; do not duplicate public event records into customer tables unnecessarily.
- [ ] Add structured scouting-entry validation: ratings `1-5`, enumerated penalty risk, bounded notes/tags, optional match number.
- [ ] Add assignment endpoints and completion status.
- [ ] Add transactional pick-list reorder endpoint so positions cannot duplicate or partially update.
- [ ] Add CSV export with authorization and safe CSV escaping.
- [ ] Add integration tests for tenancy, role permissions, concurrent reorder behavior, and read-only entitlements.

### Frontend

- [ ] Add `/workspace/[workspaceId]` as the competition-day home screen.
- [ ] Add compact mobile scouting form with structured ratings, tags, note, save state, and error recovery.
- [ ] Add team observation summary with count, averages, latest notes, and author/timestamp.
- [ ] Add scout assignment view showing assigned, completed, and missing coverage.
- [ ] Add collaborative pick-list view with stable reordering, availability status, and private notes.
- [ ] Combine public performance metrics with private observations in the decision view.
- [ ] Add CSV export action for owner/coach.
- [ ] Test at narrow mobile width and with simulated slow/intermittent network.

Offline support in this phase means preserving an unsent draft and retrying safely. Full offline multi-user synchronization is out of scope until pilots prove it is necessary.

**Exit gate:** A pilot organization can create an event workspace, invite members, enter at least 20 observations, see shared summaries, and produce an alliance pick list without administrator assistance.

## Phase 3: Run Free Design-Partner Events

**Purpose:** Observe real behavior before deciding what deserves a paywall.

- [ ] Onboard each pilot's coach and at least two scouts before its event.
- [ ] Verify the event, teams, members, and devices before event day.
- [ ] Monitor errors and usage during each event without exposing private notes.
- [ ] Record entries created, active members, assignment completion, pick-list completion, exports, and support requests.
- [ ] Conduct a 20-minute debrief within 72 hours of each event.
- [ ] Ask what decision changed because of the product and what they would lose if access disappeared.
- [ ] Ask for a second-event commitment before discussing additional features.
- [ ] Rank requested features by frequency, workflow impact, and willingness to pay.

**Exit gate:** At least three programs complete real-event usage; each creates 20+ entries and a pick list. At least two request continued access for another event. Otherwise fix activation and reliability before adding paid behavior.

## Phase 4: Manual Founding Plan

**Purpose:** Validate willingness to pay without building billing infrastructure.

- [ ] Finalize one founding offer based on pilot evidence, initially targeting `$19-39/program/season`.
- [ ] Define founding limits: member count, managed teams, events, exports, and expiration date.
- [ ] Add an entitlement service as the single backend source for `canCreateWorkspace`, `canInviteMember`, `canWriteEntry`, and `canExport` decisions.
- [ ] Add an internal admin action to activate a founding plan after verified manual payment.
- [ ] Add upgrade prompts at paid actions, not across public analytics pages.
- [ ] Implement read-only behavior after expiry; preserve view and export access.
- [ ] Add a clear entitlement/status page for the organization owner.
- [ ] Offer the founding plan to pilot programs and the next qualified prospects.
- [ ] Record offer price, acceptance/rejection, reason, payment date, first use, second-event use, and refund/support outcome.

**Exit gate:** At least five programs pay and at least three use the workspace at a second event. Continue manual collection until ten programs have paid. If customers use but do not pay, revisit the buyer, packaging, and price before automating billing.

## Phase 5: Add Paid Value One Feature at a Time

**Purpose:** Increase retention and pricing power based on observed demand.

Implement only the highest-evidence item, then observe it across two events before selecting the next item.

- [ ] Pre-event scouting report combining attending teams, public metrics, history, and private watch-list status.
- [ ] Improved scout assignment coverage and event progress dashboard.
- [ ] Coach decision dashboard combining public strength with private reliability, driver, penalty, and observation-count signals.
- [ ] Coach-friendly PDF report in addition to CSV.
- [ ] Cross-event private team history and trend view.
- [ ] Multi-team program dashboard and shared scouting policy controls.

For each selected feature:

- [ ] Link the customer evidence that justified it.
- [ ] Define one primary usage/retention metric before implementation.
- [ ] Add authorization, tests, analytics, and export behavior.
- [ ] Observe usage at two real events.
- [ ] Keep, revise, or remove it based on evidence.

**Exit gate:** Founding customers repeatedly use at least one paid-only capability and can explain its decision or time-saving value. Pricing can then be tested at `$59-99/program/season` for new customers without changing existing founding terms.

## Phase 6: Stripe Billing Automation

**Entry gate:** At least ten programs have made real payments. Manual billing has become an operational burden or renewals require automation.

- [ ] Create Stripe products/prices for the currently validated plans only.
- [ ] Add versioned migrations for subscriptions and processed billing events.
- [ ] Create Checkout Sessions on the backend for an authenticated organization owner.
- [ ] Associate Stripe customers and subscriptions with organization IDs through trusted server-side metadata.
- [ ] Add a raw-body webhook endpoint before JSON parsing for that route.
- [ ] Verify webhook signatures and reject invalid events.
- [ ] Process webhooks idempotently using the unique provider event ID.
- [ ] Derive entitlements from verified subscription state, never from the checkout success redirect.
- [ ] Handle checkout completion, active/trialing state, payment failure, cancellation, renewal, and refund scenarios.
- [ ] Add a grace state before read-only downgrade.
- [ ] Add Stripe Customer Portal access for organization owners.
- [ ] Add integration tests using Stripe test mode and replayed webhook fixtures.
- [ ] Document operational recovery for missed webhooks and mismatched entitlement state.

**Exit gate:** Test-mode checkout, renewal, failed payment, cancellation, duplicate webhook, and portal flows all produce the expected entitlement state. Production keys are stored only in deployment secrets.

## Phase 7: Formalize Tiers Only When Segmentation Exists

Do not create multiple paid tiers merely for appearance. Introduce `Team` and `Program` only when real customers divide along team count, member count, history, or administration needs.

Potential mature packaging:

| Plan | Indicative price | Intended customer |
|---|---:|---|
| Free | `$0` | Public analytics and evaluation |
| Team | `$29-59/season` | One team with several scouts |
| Program | `$99-149/season` | School/club with multiple teams and coaches |

- [ ] Analyze paid organizations by team count, active members, events, exports, and support needs.
- [ ] Interview customers near proposed plan boundaries.
- [ ] Define limits that correspond to real cost or value differences.
- [ ] Grandfather founding customers or communicate changes before renewal.
- [ ] Test plan presentation and conversion; avoid dark patterns or surprise lockouts.

## Observability

Use an analytics service or a small first-party event table, but do not place sensitive scouting-note contents in analytics payloads.

Required events:

```text
registration_completed
organization_created
managed_team_added
invitation_sent
invitation_accepted
workspace_created
scouting_entry_created
assignment_completed
pick_list_created
pick_list_completed
report_exported
upgrade_viewed
founding_offer_made
founding_payment_recorded
workspace_revisited_at_second_event
```

Core funnel:

```text
registered
  -> organization created
  -> first member invited
  -> first workspace created
  -> first 10 scouting entries
  -> pick list completed
  -> second event used
  -> paid
  -> renewed
```

Never send emails, note text, invitation tokens, JWTs, or payment secrets to analytics.

## Prediction Trust Workstream

This work runs in parallel with Phases 0-5 and must not block the collaboration MVP unless predictions are marketed as a paid promise.

- [ ] Build a repeatable historical evaluation dataset from completed matches.
- [ ] Establish a baseline using the current strength-ratio formula.
- [ ] Report accuracy, Brier score, calibration curve, missing-data rate, and performance by event level.
- [ ] Replace the ratio with a calibrated model only if holdout evaluation improves.
- [ ] Display uncertainty or thin-data state rather than false precision.
- [ ] Version the model and retain evaluation reports for every paid release.

## Security and Privacy Release Checklist

- [ ] No default production credentials are created on startup.
- [ ] JWT secret and payment secrets are required in production.
- [ ] Registration, login, reset, invitation, export, and write endpoints are rate-limited appropriately.
- [ ] Password-reset and invitation tokens are hashed, single-use, and expire.
- [ ] Every private query is organization-scoped and covered by cross-tenant tests.
- [ ] Logs exclude passwords, tokens, private note text, and payment payloads.
- [ ] Customer data can be exported and deleted by an authorized owner.
- [ ] Private scouting data is not used for public rankings without explicit permission.
- [ ] Terms, privacy policy, independent/non-affiliation statement, and data-source attribution are published before accepting broad public payments.

## Non-Goals Until Evidence Supports Them

- Native mobile applications.
- Full offline-first conflict resolution.
- Chat or social-network features.
- Advertising as the primary business model.
- Public crowdsourced scouting notes.
- Enterprise SSO.
- Event-organizer broadcast overlays.
- AI-generated scouting conclusions from private notes.
- More than one paid plan before customer segmentation is observed.

## Validation Commands

Use the repository's actual scripts at implementation time; update this section if scripts change.

```bash
# Backend unit tests
npm test

# Focused performance-score tests
node --test src/api/services/perfScore.test.js

# Frontend lint and build
cd frontend-nextjs
npm run lint
npm run build
```

Add backend integration tests for new customer routes before pilot use. Before each pilot event, verify the production health endpoint and complete a two-account cross-organization isolation smoke test.

## Success Metrics

### Pilot activation

- 3+ organizations use the product at a named real event.
- 20+ scouting entries per organization/event.
- 2+ active members per organization/event.
- A completed alliance pick list.

### Early retention

- At least two pilot organizations request and use access at a second event.
- At least 50% of activated organizations complete another event workflow.

### Payment validation

- 5 organizations make a real founding payment.
- 3 paid organizations use the product at a second event.
- 10 paid organizations before Stripe automation.

### Product reliability

- No cross-organization data exposure.
- No unrecoverable lost entries during an event.
- Error rate and support workload are recorded for every pilot.

## Open Questions

- [ ] Should the free plan include one personal event workspace or no private storage?
- [ ] Which email provider will handle verification, reset, and invitations?
- [ ] Should usernames remain required, or should email become the login identifier?
- [ ] Is organization switching needed in the first pilot?
- [ ] Which tags and ratings are game-specific versus stable across seasons?
- [ ] How long should expired organizations retain editable, read-only, and deletable data?
- [ ] Which currency and tax obligations apply to the first paid customers?
- [ ] What written permission or terms govern commercial RobotEvents API use?

Do not answer open questions by assumption when the answer affects security, legal obligations, customer data, or material product scope. Resolve them at the latest before their dependent phase.

## Decision Log

| Date | Decision | Evidence / reason |
|---|---|---|
| 2026-07-16 | Sequence work as validation -> workspace MVP -> real-event pilots -> manual paid plan -> billing automation. | Avoids building payment infrastructure before proving event use and willingness to pay. |
| 2026-07-16 | Start with free design partners, then `$19-39` founding pricing. | Product is unproven; early price should reduce adoption friction while still testing real payment behavior. |
| 2026-07-16 | Keep public data free and charge for private workflow/collaboration. | Public rankings and predictions face strong free competition; private accumulated data creates retention. |
| 2026-07-16 | Target programs/coaches as buyers. | Students are primary users but coaches/program budgets are more plausible payers and support multi-team value. |
| 2026-07-16 | Defer Stripe automation until 10 paid programs. | Manual payment is operationally adequate at low volume and prevents premature billing complexity. |
| 2026-07-16 | Do not market current match percentages as calibrated predictions. | Chronological 20-event backtest: Brier 0.2551, worse than constant base-rate 0.2490; 63.3% missing strength slots and 31.8% exact 0/100 predictions. |

## Progress Log

| Date | Phase | Work completed | Evidence / next step |
|---|---|---|---|
| 2026-07-16 | Planning | Created implementation plan; no product implementation started. | Begin Phase 0 by drafting the design-partner offer and interview record. |
| 2026-07-16 | Source control | Fetched remote and created `feature/paid-phase-0` directly from `origin/main` at `fbc5182`. | All Phase 0 work is isolated on the feature branch; existing untracked user files were preserved. |
| 2026-07-16 | Phase 0 | Completed offer, demo, discovery kit, analytics spec, API request draft, backtest tooling/tests, and initial report. | User must conduct 10 interviews, confirm 3+ named-event pilots, and send the API clarification request. |
