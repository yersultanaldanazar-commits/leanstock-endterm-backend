# Changelog

## Endterm hardening

- Added email verification on signup.
- Added password reset via email token.
- Added refresh token rotation.
- Added Redis-backed asynchronous email job queue with visibility endpoints.
- Added admin-only tenant user creation endpoint for managers/staff/auditors.
- Removed raw SQL from application code; all database operations now use Prisma ORM.
- Added pagination format to list endpoints.
- Added Redis reservation locks and reservation confirmation workflow.
- Added moving-average reorder point forecasting.
- Added more validation and tests.
