# Pilot Playbook

## Scope

Start with one region, a small set of schools, and one tournament season. Keep manual support paths available for identity verification, billing disputes, schedule overrides, and guardian access.

## Pre-Pilot

- Confirm school admins, coaches, referees, guardians, and support users have the correct roles.
- Import only reviewed athlete and school data.
- Validate public tournament pages do not expose private athlete, guardian, billing, or document fields.
- Run the production readiness checklist and k6 smoke test.
- Share support escalation contacts with each pilot school.

## Daily Pilot Checks

- Review API error rate, p95 latency, worker failures, and notification backlog.
- Sample new athlete registrations and document review decisions.
- Confirm schedules, brackets, and public results match tournament operations.
- Track support issues by school, role, severity, and resolution owner.

## Go/No-Go Gates

- No unresolved critical privacy or access-control defects.
- No repeated data-loss, duplicate billing, or schedule corruption incidents.
- Schools can complete registration, roster, match-day, result, and guardian communication workflows without engineering intervention.
- Disaster recovery restore drill has been completed for the pilot dataset.

## Exit

Document known gaps, support load, incident count, restore timing, and required product fixes before expanding to more schools or regions.
