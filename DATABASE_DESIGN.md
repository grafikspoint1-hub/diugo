# MY DIU Database Design Audit

## Current database

Prisma targets PostgreSQL through `DATABASE_URL`. The schema currently defines 26 models:

`User`, `Address`, `Category`, `Business`, `EmergencyContact`, `Product`, `Order`, `CheckoutSession`, `OrderItem`, `Payment`, `SellerSubscription`, `Booking`, `Delivery`, `Event`, `EventTicket`, `IssuedTicket`, `Review`, `Notification`, `AuditLog`, `Cart`, `CartItem`, `ClassifiedListing`, `ClassifiedEnquiry`, and `ClassifiedReport`.

Current migrations cover the initial schema, seller subscriptions, product condition, checkout/payment/inventory reservations, classifieds, and emergency contacts. The migration directory contains duplicate-dated checkout/classifieds entries that must be reconciled before production migration management.

## Implemented data areas

- Identity basics: users, roles, account status, addresses.
- Business/category/product catalog.
- Cart, orders, order items, checkout sessions, payments, and stock reservations represented by product stock/reserved-stock fields.
- Seller subscription records.
- Generic booking and delivery records.
- Events and ticket-type/issued-ticket records.
- Reviews, notifications, audit logs.
- Classified listings, enquiries, reports, seller ownership, and expiry state.
- Verified emergency contacts.

## Missing or insufficient data design

The following required domains need normalized models and migrations rather than a generic placeholder:

- OTP challenges, verification attempts, refresh sessions, password resets, login audit, consent, and device sessions.
- Business operating hours, holidays, documents, verification decisions, staff membership, permissions, and service areas.
- Product variants, option values, images, inventory movements, warehouses/dark stores, stock adjustments, tax rules, price history, and discount applicability.
- Wishlists, coupon definitions, coupon constraints, redemption ledger, rewards ledger, membership plans, and campaigns.
- Payment attempts, provider events, idempotency keys, refunds, refund items, vendor commissions, settlement batches, payout entries, and reconciliation results.
- Booking resources, room inventory, transport vehicles/providers, appointment calendars, slot locks, cancellation policies, and availability exceptions.
- Delivery partner onboarding/documents/availability/location pings/assignments/proof metadata/vendor staff assignments.
- Event order capacity locks, ticket purchase orders, QR scan events, transfer rules, and refund linkage.
- Tourism places/content revisions/media/verification/publishing workflow.
- Jobs, applications, property listings, enquiries, community posts, moderation actions, advertisements, support tickets, and review moderation.
- Notification templates, delivery attempts, provider responses, preferences, and retry state.
- Multi-city tenant/serviceability configuration and city-specific policies.

## Database correctness risks

- Migrations have not been applied in this environment because the configured credentials fail with Prisma `P1000`.
- The schema has generic `Booking` and `Event` records but no complete capacity/availability locking model.
- `Payment` has several optional unique foreign keys; the production design needs explicit payment-attempt and provider-event history for retries and reconciliation.
- Product `stock` and `reservedStock` are not a substitute for an inventory movement ledger.
- No database-level tenant/city boundary exists.
- Seed data is development-only and has not been verified against a live database.

## Migration policy required before implementation expands

1. Recover or recreate a development PostgreSQL database with known credentials.
2. Reconcile duplicate migration history and apply migrations in a clean disposable database.
3. Add migrations in small domain increments; never edit an applied migration.
4. Add integration tests that run against PostgreSQL for inventory, payment idempotency, booking capacity, ticket capacity, and permissions.
5. Add indexes and constraints from measured query paths, with explicit retention and deletion policies for personal/payment data.
