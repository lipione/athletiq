# ATHLETIQ Phase 4 Implementation Plan: Football Stats Engine

## Scope

- Capture match events.
- Support event correction without deleting source rows.
- Derive athlete + team performance from canonical event state.
- Add verification-gated leaderboards and athlete tournament summaries.

## Data additions in in-memory store

- Add `MatchEventRecord` and indexed storage.
- Keep `status` on events:
  - `active` (current)
  - `superseded` (corrected)
- Keep `correctionReason` + `correctedBy` metadata for auditability.

## Endpoints

- `POST /api/matches/:matchId/events` — submit event.
- `GET /api/matches/:matchId/events` — list event history (current + historical).
- `POST /api/matches/:matchId/events/:eventId/correct` — create corrected event without deleting old rows.
- `GET /api/matches/:matchId/stats` — derived match stats.
- `GET /api/tournaments/:tournamentId/leaderboard` — derived verified leaderboard.
- `GET /api/athletes/:athleteId` — include verified tournament totals in response.

## Validation rules

- `matchId` and `athleteId` must exist.
- `teamId` must match home/away team for that match.
- Athlete must belong to selected team.
- `type` must be supported (`goal`, `yellow_card`, `red_card`, `assist`, `foul`, `own_goal`).
- `match.status` must be `played` or `verified` to accept/correct events.

## Acceptance

- Goal increment updates player/team totals.
- Yellow/red cards are separately counted.
- Corrected event becomes the active event and old event is preserved.
- Athlete profile returns verified tournament totals.
- Leaderboards recompute from active events on each request.
