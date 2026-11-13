# MY DIU — Web Application Starter

**Product:** MY DIU — Your City. Your Everything.  
**Platform scope:** Website, Android and iOS are all in the approved coordinated launch scope. The current repository is an incomplete development scaffold, not a launch-ready release.

This bundle consolidates the current MY DIU website UI, the previous super-city UI prototype, the NestJS/PostgreSQL backend foundation, and the project reference documents.

## Project structure

- `apps/website/prototypes/my-diu-home.html` — current MY DIU marketplace prototype and demo category browsing.
- `apps/website/prototypes/seller-dashboard.html` — authenticated seller onboarding and API-backed product dashboard.
- `apps/website/prototypes/delivery-partner.html` — delivery partner sign-in, job acceptance and delivery status workspace.
- `apps/website/prototypes/api-client.js` — browser-only prototype API helper.
- `apps/backend/` — NestJS API foundation and Prisma schema/migrations.
- `apps/mobile/` — React Native workspace scaffold; app implementation pending.
- `packages/` — shared package ownership scaffolds; implementations pending.
- `infrastructure/` — Docker Compose and reserved deployment/database operations directories.
- `documentation/` — architecture references, API roadmap, and workflow notes.
- `DEVELOPMENT_STATUS.md` — current implementation, integration and launch-gap audit.
- `apps/website/prototypes/super-city-ui-prototype.html` — expanded UI prototype; demo interactions are not production workflows.

## Run the website preview

For a local HTTP preview, from `apps/website/prototypes` run:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080/my-diu-home.html` or `http://localhost:8080/seller-dashboard.html`. The seller dashboard additionally requires the backend and database; configure `WEB_ORIGIN` to match the frontend origin.

The marketplace preview contains illustrative customer/demo flows. The seller dashboard uses backend authentication and product APIs; it requires the API and database to be running. Other demo login, checkout and ticketing flows are not production-secure and do not process real payments.

## Run the API foundation

Requirements: Node.js 20+, npm, Docker.

```bash
cd apps/backend
cp .env.example .env
# Set a strong JWT_SECRET and configure DATABASE_URL.
docker compose -f ../../infrastructure/docker/docker-compose.yml up -d
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```

API base URL: `http://localhost:4000/api/v1`

Initial endpoints in this starter:

- `GET /api/v1/health`
- `POST /api/v1/auth/register` (customer registration only)
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me` (JWT protected)
- `GET /api/v1/categories`
- `GET /api/v1/businesses`
- `GET /api/v1/products`

See `apps/backend/README.md` and `documentation/api/API-ROADMAP.md` for details.

From the repository root, `npm run build:backend` builds the existing API workspace and `npm run dev:backend` starts it in watch mode. Run `npm run dev:website` to start the implemented Next.js customer website. The mobile workspace remains a React Native scaffold.

## Product scope retained for the web application

1. Public homepage and global search
2. Customer registration, login and account
3. Local business directory and public vendor storefronts
4. Multi-vendor product catalogue and shopping
5. Cart, checkout and order history
6. Food, grocery and quick-commerce categories
7. Hotel, travel, transport and appointment discovery/booking workflows
8. Quick delivery operations and delivery partner workspace
9. Explore Diu / tourism and destination information
10. Events, registrations and ticketing
11. Deals, offers and coupons
12. Emergency and essential-service directory
13. Home services
14. Jobs and careers
15. Property listings
16. Community updates and city information
17. Reviews, notifications, customer support, rewards and membership
18. Vendor dashboard and business management
19. Super Admin, moderation, CMS, SEO, reports and audit activity

The exact transaction rules, partner onboarding, payment and refund policies, and verified local content must be finalized before production launch. The uploaded initial scope document also identifies items that were proposed or require confirmation; do not treat those as live features simply because a screen is present in a prototype.

## Current implementation status — read before launch

| Area | Included now | Production status |
|---|---|---|
| Responsive website UI | HTML prototypes and sample screens | Preview/demo only |
| API foundation | NestJS, Prisma schema, health, auth starter, public catalogue | Starter; not fully tested or deployed |
| Database | PostgreSQL schema and local Docker setup | Migration and production DB not yet verified |
| Roles | Role fields/schema direction | Full role/permission guards still required |
| Vendor onboarding and approval | API submission and admin approval; seller UI | Document verification and operational review still required |
| Products and inventory | API-backed seller create/list/update/deactivate; public catalogue | Image storage, stock movement ledger and reservation transactions still required |
| Cart and checkout | UI demo | Server-side checkout and stock locking still required |
| Payments/refunds/settlements | Data model/roadmap | No live gateway connection |
| Bookings and availability | UI and data model/roadmap | Availability engine and provider workflows still required |
| Delivery dispatch/tracking | UI concept and data model/roadmap | No live GPS, dispatch or tracking |
| Event QR tickets | UI/data model direction | Ticket issuance, payment and scanner verification still required |
| Email/SMS/WhatsApp/maps/storage | Integration points identified | Not connected |
| Deployment/domain | Deployment-ready planning only | No hosting or DNS deployment performed |

## Recommended production architecture

- Web frontend: Next.js (production implementation target; current supplied HTML remains the UI reference/demo).
- API: NestJS REST API.
- Database: PostgreSQL (Neon-compatible `DATABASE_URL`) with Prisma.
- Cache/jobs: Redis.
- Hosting target: Render for API and a suitable web frontend host; configure secrets and origins in the provider dashboard.
- Shared role-based web portals: customer, vendor, delivery partner, service/event partner where enabled, and Super Admin.

## Required before production launch

- Implement and test all API domains and role-based access controls.
- Connect the frontend to the API; remove browser-only demo credentials and local demo data.
- Configure real email/SMS OTP and password recovery.
- Configure payment gateway, verified webhooks, refunds and settlements. Never collect/store UPI PINs or raw card details.
- Implement stock reservation, idempotent checkout, booking capacity/slot locking and cancellation policies.
- Configure file storage, image moderation, maps, notification delivery and delivery dispatch.
- Load only verified business, tourism, transport and emergency information.
- Complete security, privacy, accessibility, performance and legal/compliance reviews.
- Configure production backups, monitoring, TLS, DNS and incident recovery.

**No live service, payment, production database, hosting deployment or external integration is claimed by this starter bundle.** Those steps require provider accounts, credentials, operational decisions and end-to-end verification.
# ADMIN LOGIN & ACCOUNT RECOVERY SETUP

## Existing account and login path

Administrators use the dedicated website route `/admin/login`, backed by `POST /api/v1/auth/admin/login`. Sign-in accepts the administrator username (or the existing email/phone identifier), verifies the stored bcrypt hash, and returns the existing bearer-token format. Only `ADMIN` and `SUPER_ADMIN` accounts can sign in there. All admin API controllers continue to enforce roles on the backend. The project seed creates categories only; it does not create an admin account. Source files therefore contain no default admin username or password, and an existing database account cannot be inferred from the repository. Password hashes cannot be recovered; use the recovery flow or operator provisioning procedure.

## Database and migration

The schema uses PostgreSQL and Prisma. The new migration adds a nullable unique username, a phone-verification timestamp, a session version, OTP recovery request records, and login-attempt records. Run these from the repository root after confirming the backend `.env` points to the intended database:

```powershell
npm run prisma:generate --workspace my-diu-backend
npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma
```

For a disposable local database where migration history is not yet established, use the existing project setup instructions before deploying migrations. Never use `migrate reset` against a database with user data.

## SMS and recovery configuration

Set these values in `apps/backend/.env` or the deployment secret manager. The `.env.example` contains placeholders only. `ADMIN_RECOVERY_PHONE` is fixed by the server operator; requests cannot supply another number. The admin account's `User.phone` must match this setting. The recovery UI displays only a masked number, and successful OTP verification records phone possession in `phoneVerifiedAt`.

```dotenv
ADMIN_RECOVERY_PHONE=+918866383477
OTP_HASH_SECRET=<at-least-32-random-characters>
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=<Twilio account SID>
TWILIO_AUTH_TOKEN=<Twilio auth token>
TWILIO_FROM_PHONE=<Twilio SMS-capable number>
JWT_SECRET=<at-least-32-random-characters>
```

Generate unrelated secrets, for example with PowerShell:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

The backend currently supports Twilio's HTTPS Messages API. SMS credentials stay on the backend. OTP requests fail with a clear configuration error in development when Twilio is not configured; there is no fake OTP or SMS-success fallback. Production startup requires separate `JWT_SECRET` and `OTP_HASH_SECRET` values of at least 32 characters and should only be exposed over HTTPS. If the API is behind a trusted reverse proxy, set `TRUST_PROXY_HOPS` to the exact proxy hop count so IP throttling uses the client address safely.

Recovery only selects an `ADMIN` or `SUPER_ADMIN` whose phone exactly matches `ADMIN_RECOVERY_PHONE`. The SMS OTP verifies possession before credentials can be changed. Recovery sends a cryptographically random 6-digit OTP by Twilio, stores only its HMAC, expires it after 5 minutes, allows at most 5 incorrect entries, enforces a 60-second resend cooldown, and limits requests to 5 per hour by IP and configured recovery number. Successful verification returns a 10-minute, single-use token scoped only to credential reset. The reset updates the username/password transactionally, increments the JWT session version to invalidate prior sessions, records audit events, and attempts a confirmation SMS.

## Development-only first administrator

There is no public admin registration. On a development database, run migrations and then use the hidden-password interactive provisioner. It refuses to run in production and refuses to create a second administrator. Leave the username blank to use `DIU-ADMIN`; the password must be strong and is entered without echo:

```powershell
npm run prisma:generate --workspace my-diu-backend
npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma
npm run provision-admin --workspace my-diu-backend
```

Choose a username of 3–32 letters, digits, dots, underscores, or hyphens. The password must be at least 12 characters and include uppercase, lowercase, a number, and a symbol. Provisioning uses bcrypt (12 rounds) to match the existing project standard. For a production first administrator, use an approved controlled database/operator process; never run the development provisioner in production or overwrite an existing admin.

## Frontend and API routes

- Website: `/admin/login` and `/admin/recover`
- `POST /api/v1/auth/admin/login`
- `GET /api/v1/auth/admin/recovery/info` (masked phone only)
- `POST /api/v1/auth/admin/recovery/request-otp`
- `POST /api/v1/auth/admin/recovery/resend-otp`
- `POST /api/v1/auth/admin/recovery/verify-otp`
- `POST /api/v1/auth/admin/recovery/reset`

Run the frontend and API with the existing workspace scripts:

```powershell
npm run dev:backend
npm run dev:website
```

SMS delivery cannot be confirmed until valid Twilio credentials, a permitted sender number, the migration, and a matching admin account are configured in the target environment. Do not share `.env` values or OTPs while diagnosing setup.
