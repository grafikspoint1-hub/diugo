# MY DIU API Documentation Audit

**Base path:** `/api/v1`  
**Intended local API:** `http://localhost:4000`

## Existing endpoints

### Health and identity

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me` (JWT)

### Public catalog

- `GET /categories`
- `GET /businesses`
- `GET /businesses/:slug`
- `GET /products`
- `GET /products/:id`
- `GET /events`
- `GET /emergency-contacts`

### Vendor

- Subscription status, checkout, and verification.
- Business registration and current business retrieval.
- Delivery settings.
- Product create/list/update/delete.
- Vendor order list and status update.

### Commerce

- Authenticated cart read and item create/update/delete.
- Checkout quote, checkout creation, pending checkout, and payment verification.
- Authenticated order list/detail.
- Razorpay webhook receiver.

### Delivery

- Delivery job list.
- Partner accept.
- Delivery status update.

### Classifieds

- Public search/detail/seller profile.
- Authenticated owner listing CRUD/status/renewal.
- Enquiries, replies, and reports.

### Admin/emergency

- Limited business approval, overview, order listing, user-role assignment, classifieds moderation, and emergency-contact CRUD.

## API capabilities not implemented

- OTP and verification lifecycle.
- Addresses and customer profile management.
- Vendor staff and permission management.
- Wishlist, variants, product images, inventory ledger, tax, coupons, refunds, settlements, reconciliation.
- Hotel/room, travel/transport, appointment, home-service, tourism, job, property, community, and offer APIs.
- Event ticket purchase, QR issuance, QR scan validation, capacity locking, cancellations, and refunds.
- Delivery partner registration, availability, dispatch, location tracking, vendor delivery assignment, and proof workflow.
- Notifications, support, reviews moderation, analytics/report exports, advertisements, and system settings.
- File upload/media APIs and signed storage access.

## Cross-cutting API gaps

- No documented error envelope, pagination standard, filtering/sorting contract, idempotency-key contract, or API deprecation policy.
- Authentication is access-token-only; no refresh/session/OTP/reset contract.
- No request correlation IDs, rate limits, structured logs, or public OpenAPI/Swagger contract was found.
- No integration test suite runs against a live PostgreSQL instance.

## API implementation rule for the next phases

Every new endpoint should define DTO validation, authentication/role policy, transaction boundary, idempotency behavior where applicable, error mapping, audit requirements, pagination, and integration tests before being exposed to the frontend.
