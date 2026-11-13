# MY DIU Architecture

## Current target

MY DIU is a multi-city-ready super-app for Diu with a responsive Next.js website, planned React Native Android/iOS clients, a centralized NestJS REST API, Prisma and PostgreSQL persistence, and Redis for future cache/jobs.

## Current repository

- `apps/website`: Next.js customer discovery/account experience and preserved HTML prototypes.
- `apps/backend`: NestJS API foundation, Prisma schema, authentication, catalog, vendor, commerce, delivery and admin modules.
- `apps/mobile`: React Native scaffold; implementation pending.
- `packages/`: shared contract/config package scaffolds.
- `infrastructure/`: Docker and deployment documentation.

## Domain boundaries

E-commerce, food, grocery, hotel, appointment, transport, events, home services, directory, tourism, emergency, jobs, property, community, offers and rewards must retain separate domain models, services, validation, status transitions, APIs, dashboards and tests.

## E-commerce payment and inventory flow

The customer cart is database-backed. A checkout session represents one customer payment across one or more vendor orders. Checkout snapshots vendor line items and reserves stock in a transaction; a single Razorpay payment is attached to the session. The backend verifies signed callbacks with Razorpay's payment API and verifies signed webhooks against the raw request body. Only a captured, matching payment consumes stock and marks orders paid. Reservations expire after 15 minutes; late captured payments are flagged for manual refund handling. MY DIU network delivery uses a configured system fee; vendor-managed delivery uses each business's configured fee. MY DIU delivery jobs are created only after verified payment.

## Independent Buy & Sell classifieds

Community classifieds use dedicated `ClassifiedListing`, `ClassifiedEnquiry` and `ClassifiedReport` records and do not enter the shopping cart, vendor checkout, stock reservation or online-payment flows. Public search exposes active, unexpired listings; owners can create, edit, pause, resume, mark sold, soft-remove and renew for 30 days. Enquiries and seller replies are private to the buyer and listing owner; seller contact data is not published. Administrators can review reports, remove listings and inspect listings through role-protected routes, with decisions recorded in the audit log. Images currently use owner-supplied HTTPS URLs because no upload/storage integration exists. Expiry is enforced in public queries and seller listing management; no background scheduler is configured yet.

## Emergency contacts

The public `/emergency` page is unauthenticated and has one-tap phone links, category/search filters, official source links, visible verification dates, and consent-based browser location for Google Maps directions/nearby-service search. A small government-source-backed fallback keeps core numbers visible if the API is unavailable; it is not a replacement for synchronized database records. `EmergencyContact` persists additional contacts, source, verification/activity state, translated names, hours and optional coordinates. Only active + verified records are public. ADMIN/SUPER_ADMIN CRUD is audited. No emergency dispatch, live availability, or unverified medical/marine/veterinary/utility listings are implied.

## Category-wise homepage feed

The home feed groups active catalog products, approved businesses, upcoming published events, and active/unexpired classifieds by their existing category relations. Products retain vendor cart behavior; classifieds remain direct-to-seller and never enter checkout. Rows link to the corresponding category/module route and appear only when real API records exist. No demo listing fallback is used.

## Non-negotiable controls

Server-side authorization, role isolation, validated inputs, server-verified online payments, idempotent transactions, integer paise, two fulfilment models, and verified emergency/content records are required before launch.

See [DEVELOPMENT_STATUS.md](../DEVELOPMENT_STATUS.md) for the current implementation audit and launch gaps.
