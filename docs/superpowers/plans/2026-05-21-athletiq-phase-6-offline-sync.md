# ATHLETIQ Phase 6 Implementation Plan: Offline Match-Day Sync

## Scope

- Mutation queue endpoint for offline-first mobile flows.
- Idempotent client mutation IDs.
- Retry + conflict state support.

## Data additions in in-memory store

- Add `SyncMutationRecord`:
  - `mutationId`
  - `clientId`
  - `actorUserId`
  - `status` (`pending` | `synced` | `failed` | `conflict`)
- Optional `errorReason` + `payload` for replay/conflict review.

## Endpoints

- `POST /api/sync/mutations/push`
- `GET /api/sync/mutations/:clientId`

## Validation rules

- `clientId` and mutation payload required.
- Duplicate `mutationId` per `clientId` must be idempotent.
- Events are replayed against existing match-event APIs; failures are retained and not dropped.

## Acceptance

- Offline submissions are accepted as queued mutations.
- Duplicate mutation IDs do not duplicate side effects.
- Conflicts are marked for review.
- Failed mutations remain in queue for retry.
