# MY DIU Development Roadmap

## Audit baseline

The existing project is not production-ready. Web TypeScript checks, backend build, Prisma client generation, and nine backend unit/safety tests pass. Database migration status and runtime API verification are blocked by invalid PostgreSQL credentials. Docker is unavailable in the current environment.

## Current execution status — 2026-11-10

- Audit documents completed.
- Phase 2 non-database hardening started: request correlation IDs and a centralized JSON HTTP exception filter were added to the NestJS bootstrap.
- Backend build and all 9 existing backend tests pass after the hardening change.
- Database-dependent Phase 2 work remains blocked by PostgreSQL service access/credentials.

## Phase 0 — Environment recovery (blocking)

- Obtain valid development PostgreSQL credentials or recreate a disposable local database.
- Install/enable a supported container runtime or document the managed PostgreSQL alternative.
- Reconcile duplicate migration history and apply all migrations to a clean database.
- Run seed and verify health, auth, catalog, and emergency endpoints.
- Configure non-secret local integration values for delivery fee, subscription pricing, and API origin.

## Phase 1 — API foundation hardening

- Add centralized exception handling, structured logging, request IDs, rate limiting, and consistent errors.
- Add API contract generation/documentation and pagination conventions.
- Add secure auth lifecycle: email/phone verification, OTP provider abstraction, refresh sessions, reset flow, throttling, and account audit.
- Add exact role/permission model including business owner/staff and resource-level authorization.
- Add storage abstraction and validated upload flow.
- Add Redis integration only with explicit cache, queue, retry, and idempotency contracts.

## Phase 2 — Core identity, business, and commerce completion

- Normalize business verification, hours, staff, service areas, product variants, media, inventory ledger, taxes, pricing, wishlist, and customer addresses.
- Complete checkout cancellation/returns/refunds and concurrency integration tests.
- Add payment attempts, provider events, idempotency, refund automation, settlements, and reconciliation.
- Connect customer, vendor, and admin web workflows to live API data.

## Phase 3 — Delivery and booking engines

- Implement partner onboarding, availability, dispatch, assignment, tracking, proof of delivery, and vendor-managed delivery.
- Implement hotel, transport, appointment, home-service, and activity resource/slot availability with transactional locks.
- Add cancellation policies and payment/refund linkage.

## Phase 4 — Remaining category engines

- Food and grocery ordering.
- Events, ticket capacity, QR issuance/scanning, and refunds.
- Tourism CMS and publishing verification.
- Jobs, property, community, offers/coupons/rewards, reviews, advertisements, and support.
- Complete classifieds chat/enquiry experience without automatic checkout.

## Phase 5 — Operations, mobile, and localization

- Build complete admin management, moderation, analytics, reports, audit, settings, and settlement operations.
- Implement the React Native Android/iOS client using the versioned API and shared types.
- Add full English/Gujarati/Hindi catalogs and UI translation workflow.
- Add city/tenant/serviceability model before multi-city expansion.

## Phase 6 — Production readiness

- Automated unit, integration, end-to-end, concurrency, security, accessibility, and mobile tests.
- Configure payment, OTP, email/SMS, maps, push, storage, monitoring, alerts, backups, TLS, DNS, privacy/legal policies, and disaster recovery.
- Remove preview-only content from production paths.
- Conduct a launch gate review; do not claim completion until live database and provider workflows pass.

## Definition of done

A module is complete only when its schema migration, validated API, permissions, transaction rules, frontend workflow, failure/loading states, automated tests, observability, documentation, and production configuration are all verified. Schema-only models, sample cards, or untested provider code do not count as completed functionality.
