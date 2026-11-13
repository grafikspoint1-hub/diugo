# MY DIU Backend Foundation

A starter backend for the MY DIU Super City Platform. It establishes the shared API/database foundation for the web app, Android/iOS apps, vendor workspace, delivery partner app and admin console.

## Included in this starter

- NestJS REST API with `/api/v1` prefix
- PostgreSQL + Prisma data model
- Redis service in Docker Compose for future queues/cache
- Customer registration/login using bcrypt + JWT
- JWT-protected `GET /api/v1/auth/me`
- Public category, business and product catalogue endpoints
- Initial data models for vendors, products, orders, payments, bookings, delivery, events/tickets, reviews, notifications and audit logs
- Helmet, CORS configuration and request validation

## Not yet connected

This is a backend foundation, not a deployed production system. Seller subscriptions and customer checkout both use server-created Razorpay orders and server-side payment verification. Customer orders now have cart-wide payment sessions, vendor order snapshots, transactional stock reservations, signed webhook verification and reservation expiry. These flows remain unusable until their database migrations and Razorpay credentials are configured. Automated refunds, reconciliation, general customer OTP, email, WhatsApp, maps/GPS, push notifications, file storage, booking inventory/availability, settlement automation, event QR scanning and partner workflows remain outstanding. Admin account recovery is implemented with a Twilio adapter but requires production configuration and a matching admin recovery phone.

## Requirements

- Node.js 20+
- Docker Desktop or Docker Engine
- npm

## Run locally

1. Copy `.env.example` to `.env`.
2. Replace `JWT_SECRET` with a long random secret. Change the local database password consistently in `.env` and `docker-compose.yml`.
3. Start infrastructure:

   ```bash
   docker compose -f ../../infrastructure/docker/docker-compose.yml up -d
   ```

4. Install packages:

   ```bash
   npm install
   ```

5. Generate Prisma client and create the database tables:

   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

6. Start the API:

   ```bash
   npm run start:dev
   ```

7. Test:

   - `GET http://localhost:4000/api/v1/health`
   - `GET http://localhost:4000/api/v1/categories`
   - `GET http://localhost:4000/api/v1/businesses`
   - `GET http://localhost:4000/api/v1/products`

   The seed command creates the 13 development categories, including pre-owned Buy & Sell listings. It is idempotent and refuses to run when `NODE_ENV=production`.

## Authentication API

### Register customer

`POST /api/v1/auth/register`

```json
{
  "name": "Demo Customer",
  "email": "customer@example.com",
  "phone": "+919999999999",
  "password": "ChangeThis123"
}
```

At least one of email or phone is required. Public registration always creates a CUSTOMER account. Vendor, delivery, organizer and admin privileges must only be granted through verified onboarding/admin workflows.

### Login

`POST /api/v1/auth/login`

```json
{
  "identifier": "customer@example.com",
  "password": "ChangeThis123"
}
```

Use the returned access token as `Authorization: Bearer <token>`.

## Important money convention

All monetary amounts in the database are integer paise (`₹1 = 100 paise`) to avoid floating-point currency errors. Format rupees in the client.

## Production hardening required before launch

- Use managed secrets; never commit `.env`.
- Configure unique JWT and OTP hashing secrets, Twilio credentials, and a verified admin recovery phone.
- Add refresh-token rotation and continue security testing of the existing bearer-token architecture.
- Add role/permission guards to every partner/admin route.
- Add idempotent payment webhooks and server-side signature verification.
- Add transactional checkout, inventory reservation and booking capacity locking.
- Add privacy retention/deletion controls, audit review and security testing.
- Configure production CORS, TLS, backups, monitoring and disaster recovery.
- Obtain required legal/compliance review and partner onboarding before enabling regulated categories.

## Suggested next implementation sequence

1. RBAC, vendor onboarding and document verification.
2. Product management and inventory.
3. Multi-vendor cart, checkout and payment gateway adapter.
4. Order fulfilment, delivery assignment and tracking.
5. Booking availability/slot engine and payment.
6. Event ticket inventory, QR issuance and scan verification.
7. Admin operations, refunds, settlements and reporting.
8. Notifications, maps, analytics and mobile API integration.


## Added implementation checkpoint
- Vendor business submission (pending admin verification)
- Admin pending-vendor queue, approve/reject action and overview counts
- Vendor product create/list/update/deactivate endpoints scoped to the vendor's own approved business
- JWT role guard for vendor and admin routes
- Browser API helper at `../website/prototypes/api-client.js`

Implemented routes:
- `POST /api/v1/vendor/businesses` (authenticated customer)
- `GET /api/v1/vendor/business`
- `POST /api/v1/vendor/products`, `GET /api/v1/vendor/products`, `PATCH /api/v1/vendor/products/:id`, `DELETE /api/v1/vendor/products/:id` (approved vendor)
- `GET /api/v1/vendor/subscription`, `POST /api/v1/vendor/subscription/checkout`, `POST /api/v1/vendor/subscription/verify` (approved vendor)
- `../website/prototypes/seller-dashboard.html` — API-backed vendor onboarding and product management; serve the frontend over HTTP and configure `WEB_ORIGIN` for that origin.
- `GET /api/v1/admin/overview`
- `GET /api/v1/admin/businesses/pending`
- `PATCH /api/v1/admin/businesses/:id/decision` with `{ "decision": "APPROVE" | "REJECT" }`

There is no public admin registration. Provision the first SUPER_ADMIN through a controlled one-time operator procedure. Backend compilation and seed-script type-checking passed on 2026-11-09; applying the Prisma migration, running the seed, and API/database integration tests remain outstanding.

Vendor product requests use DTO validation, verify referenced categories, and reject MRP values below the selling price. Product deletion is a soft delete (`INACTIVE`) so historical order items retain their product reference.

Seller subscriptions use `SELLER_SUBSCRIPTION_PRICE_PAISE` and `SELLER_SUBSCRIPTION_PERIOD_DAYS`. Set a positive price and configure `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`; secrets remain server-side. Product create/edit, public catalog visibility, cart and checkout require a current verified subscription. A signed client callback is checked against Razorpay's server API for captured status, order, amount and INR currency before activation. The migration must be applied before using these routes. Automatic renewal, refunds, and webhook-based reconciliation are not implemented.

Products use `NEW`, `LIKE_NEW`, `GOOD` or `FAIR` condition. Products assigned to the `buy-sell` category must be listed as pre-owned (`LIKE_NEW`, `GOOD` or `FAIR`). The product-condition migration must be applied before using the field.


## Commerce and delivery checkpoint
- Authenticated cart CRUD with product/business availability checks.
- Multi-vendor checkout quote groups line items by seller.
- Checkout creates one `PENDING_PAYMENT` order per seller and a delivery job for delivery fulfilment.
- Customer order history/detail endpoints.
- Vendor order list and guarded order status transitions.
- Delivery partner job feed, atomic job acceptance and guarded delivery status transitions.
- Admin order list and restricted operational role provisioning.

**Customer order payments are implemented but not operationally configured.** Checkout fails closed unless Razorpay credentials exist, reserves stock for 15 minutes, and does not mark an order paid until the server verifies a captured Razorpay payment. Signed webhooks are enabled; late captured payments require manual refunds. The migration has not been applied because the configured local PostgreSQL credentials were rejected. MY DIU delivery requires `MY_DIU_DELIVERY_FEE_PAISE`; vendor-managed delivery requires a fee configured on the business. Delivery partners must be provisioned by an admin. The backend has compiled, but has not been database-migrated or end-to-end payment-tested in this environment.
