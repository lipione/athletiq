# Disaster Recovery

## Objectives

- Recovery time objective: 4 hours for pilot, 1 hour before broad production.
- Recovery point objective: 24 hours for pilot, 1 hour before broad production.

## Backups

- Back up Postgres with encrypted, versioned snapshots.
- Persist Redis only for queues and transient operational state; do not treat Redis as system of record.
- Store backup metadata with environment, commit SHA, database version, start time, finish time, and checksum.
- Test restores at least once before pilot and monthly after launch.

## Restore Runbook

1. Freeze writes by placing the API behind maintenance routing.
2. Record the incident start time, affected environment, and release SHA.
3. Provision a clean Postgres instance.
4. Restore the selected snapshot and verify checksum.
5. Point a staging API at the restored database.
6. Validate `/api/health`, login, school roster reads, tournament reads, billing history, and public pages.
7. Promote the restored database endpoint through the secret manager.
8. Restart API and worker deployments.
9. Run the k6 smoke test.
10. Re-enable writes and monitor errors, latency, and worker backlog for 30 minutes.

## Incident Notes

Keep a single incident document with timeline, commands run, owner, data-loss assessment, user communications, and follow-up actions.
