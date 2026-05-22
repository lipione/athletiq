# ATHLETIQ Phase 5 Implementation Plan: QR Infrastructure

## Scope

- Deterministic QR payloads for athlete, match, and team resources.
- Public read endpoints for athlete profile and match sheet.
- Scan audit trail.
- Safe public data exposure for athletes and matches.

## Data additions in in-memory store

- Add `QrCodeRecord`:
  - `code`
  - `resourceType` (`athlete` | `match` | `team`)
  - `resourceId`
  - `createdBy`
  - timestamps

## Endpoints

- `POST /api/qr/athlete/:athleteId`
- `POST /api/qr/match/:matchId`
- `POST /api/qr/team/:teamId`
- `GET /api/public/athlete/:qrCode` (public)
- `GET /api/public/match/:qrCode` (public)
- `POST /api/qr/scan` (authenticated)

## Acceptance

- QR resolves to expected public resource.
- Public athlete response excludes sensitive personal fields.
- Authorized scans are logged as audit events.
