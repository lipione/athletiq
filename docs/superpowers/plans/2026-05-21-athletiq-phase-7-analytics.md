# ATHLETIQ Phase 7 Implementation Plan: Federation Analytics

## Scope

- Read-heavy federation/government reporting endpoints.
- Verified counts and simple export format.
- Federation override action with audit trail.

## Role additions

- `federation_admin`
- `government_viewer`

## Endpoints

- `GET /api/analytics/federation/overview`
- `GET /api/analytics/federation/participation?tournamentId=` (optional)
- `GET /api/analytics/tournaments/:tournamentId/export`
- `POST /api/analytics/federation/overrides`

## Metrics

- school registrations and verified athletes
- tournament participation counts
- event-derived leaderboards as federation summary

## Acceptance

- Federation roles read authorized reports.
- Government role has read-only profile.
- Official metrics can exclude non-identity-approved athletes.
- Export endpoint returns a consumable JSON payload for reporting.
- Override action writes audit log.
