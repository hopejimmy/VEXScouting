# Phase 0 Product Analytics Specification

**Status:** Event contract defined; analytics provider not selected.

## Objective

Measure whether a program completes the event-day workflow and returns for another event. Do not capture private scouting content.

The core funnel is:

```text
organization_created
  -> invitation_accepted
  -> workspace_created
  -> first 10 scouting entries
  -> pick_list_completed
  -> second event used
  -> founding payment recorded
```

## Common Event Envelope

Every product event should use these fields:

| Field | Type | Requirement |
|---|---|---|
| `event_name` | string | One name from the catalog below |
| `occurred_at` | RFC3339 timestamp | Generated server-side where possible |
| `anonymous_id` | string | For anonymous sessions; rotate when appropriate |
| `user_id` | integer/string | Internal ID; omit for anonymous users |
| `organization_id` | integer/string | Required for organization workflow events |
| `workspace_id` | integer/string | Required for event-workspace activity |
| `plan` | enum | `free`, `pilot`, `founding`, `team`, or `program` |
| `app_version` | string | Deployed commit SHA or release version |

Use opaque internal identifiers. Do not send email addresses, usernames, team-member names, note contents, invitation tokens, JWTs, or payment credentials.

## Event Catalog

| Event | Trigger | Additional properties |
|---|---|---|
| `registration_completed` | Verified user completes registration | `method` |
| `organization_created` | Organization transaction commits | `managed_team_count` |
| `managed_team_added` | Team is attached to organization | `match_type` |
| `invitation_sent` | Invitation transaction commits | `invited_role` |
| `invitation_accepted` | Invite is accepted | `invited_role`, `hours_to_accept` |
| `workspace_created` | Event workspace transaction commits | `match_type`, `division_selected` |
| `scouting_entry_created` | Valid entry transaction commits | `has_match_number`, `tag_count`, `has_note` |
| `assignment_completed` | Assignment becomes complete | `assignment_type` |
| `pick_list_created` | First list is created | `initial_item_count` |
| `pick_list_completed` | Coach explicitly marks list ready | `item_count`, `observed_team_count` |
| `report_exported` | Authorized export succeeds | `format`, `row_count` |
| `upgrade_viewed` | Upgrade dialog/page is viewed | `trigger_capability` |
| `founding_offer_made` | Admin records a concrete offer | `price_usd`, `expires_at` |
| `founding_payment_recorded` | Verified payment is recorded | `price_usd`, `payment_method`, `season_id` |
| `workspace_revisited_at_second_event` | Organization creates/uses a later event | `days_since_first_event` |

Do not emit success events when the database operation fails. Prefer server-side emission after transaction commit for billing, membership, entry, and completion events.

## Derived Metrics

| Metric | Definition |
|---|---|
| Organization activation | Workspace created, 2+ active members, 10+ entries, and a completed pick list |
| Full pilot completion | Activation plus 20+ entries at the named pilot event |
| Second-event retention | Activated organization uses a different event workspace |
| Scout participation | Distinct active entry authors per workspace |
| Coverage | Completed assignments / created assignments |
| Pick-list completion rate | Organizations completing a list / organizations creating a workspace |
| Founding conversion | Organizations with recorded payment / organizations receiving a concrete offer |

## Privacy and Retention

- Product analytics must never contain the text or rating values of private scouting entries.
- Restrict analytics access to operators who need aggregate product information.
- Define a retention period before enabling analytics in production.
- Support deletion by user and organization identifier.
- Document the provider and data region in the privacy policy.
- Obtain any required consent before tracking non-essential client-side behavior.

## Implementation Decision Gate

Choose between a first-party append-only event table and a hosted analytics provider during Phase 1. The decision must consider cost, deletion support, data region, consent requirements, and operational burden. Do not install an analytics SDK during Phase 0 solely to satisfy this specification.
