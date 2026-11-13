# MY DIU System Architecture

## Current architecture

```text
Browser
  -> Next.js website (apps/website, port 3000)
       -> server-side catalog fetches / client API calls
       -> fallback/sample UI when API is unavailable

Next.js website
  -> NestJS REST API (apps/backend, intended port 4000, /api/v1)
       -> Prisma Client
            -> PostgreSQL

Declared but not connected:
  Redis, Razorpay, maps/GPS, OTP provider, Firebase/push, cloud storage
```

## Current boundaries

- `apps/website` owns the customer Next.js UI and browser-side API calls.
- `apps/backend` owns the NestJS API, Prisma schema, migrations, authentication, commerce logic, vendor logic, delivery logic, classifieds, emergency contacts, and limited administration.
- `apps/mobile` is a placeholder and does not yet consume the API.
- `packages/*` are package-name scaffolds and are not currently a shared contract layer.
- `infrastructure/docker/docker-compose.yml` declares PostgreSQL and Redis but is not runnable in the audited environment because Docker is not installed.

## Target architecture

```text
Web / Android / iOS
  -> versioned API client and shared DTO/types
  -> API gateway concerns: CORS, rate limits, request IDs, validation, auth
  -> domain modules:
       identity, businesses, catalog, commerce, payments, bookings,
       delivery, events, tourism, services, jobs, property, community,
       offers/rewards, classifieds, notifications, support, admin
  -> PostgreSQL (transactional source of truth)
  -> Redis (cache, idempotency, locks, queues)
  -> worker processes (expiry, notifications, settlement, reconciliation)
  -> external providers: Razorpay, OTP/SMS, email, maps, object storage, push
```

## Architectural requirements for implementation

1. Keep the existing NestJS/Prisma/Next.js stack; do not introduce a second backend framework.
2. Make every financial, stock, booking-capacity, ticket-capacity, and delivery-state transition server-owned and transactional.
3. Use idempotency keys for payment, checkout, booking, ticket, refund, and webhook operations.
4. Keep provider credentials server-side and expose only safe public configuration to web/mobile clients.
5. Version API contracts and publish DTO/error formats for future Android and iOS clients.
6. Separate public read models from privileged write/admin workflows.
7. Add background workers only after Redis/job contracts and retry/dead-letter policies are defined.

## Current architectural risks

- API startup hard-fails on database authentication failure.
- Frontend fallback content can mask the absence of live data unless production builds disable illustrative content.
- Domain models exist for some future features without corresponding service/controller/workflow implementations.
- No shared package currently prevents web/mobile/API contract drift.
- No deployment topology, worker runtime, secret manager, observability, or backup strategy is implemented.
