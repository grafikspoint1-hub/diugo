# MY DIU API Documentation

## Base URL

Local API: `http://localhost:4000/api/v1`

## Authentication and money

Protected customer and vendor routes require a bearer JWT. All monetary values are integer paise. Customer checkout accepts online Razorpay payment only; COD and Pay at Store are not valid methods.

## Administrator sign-in and recovery

- `POST /auth/admin/login`: admin-only sign-in by username, email, or phone; requires `identifier` and `password`.
- `GET /auth/admin/recovery/info`: returns only the masked configured recovery phone and availability state.
- `POST /auth/admin/recovery/request-otp`: sends a 6-digit code to the configured, verified administrator phone; no phone is accepted in the request.
- `POST /auth/admin/recovery/resend-otp`: requires `{ "requestId": "..." }` and enforces the cooldown.
- `POST /auth/admin/recovery/verify-otp`: requires `{ "requestId": "...", "otp": "123456" }`; returns a short-lived recovery-only token on success.
- `POST /auth/admin/recovery/reset`: requires `recoveryToken`, `username`, `confirmUsername`, `password`, and `confirmPassword`.

OTP and credential reset routes are rate limited and audited. OTPs are HMAC-hashed in PostgreSQL and expire after five minutes; recovery tokens are SHA-256 hashed, single use, and expire after ten minutes. The reset invalidates previously issued JWTs by incrementing the user's session version. Configure Twilio and `ADMIN_RECOVERY_PHONE` before requesting SMS. Recovery requires an admin `User.phone` matching the server-configured number; successful OTP verification records phone possession in `phoneVerifiedAt`. See the root README's **ADMIN LOGIN & ACCOUNT RECOVERY SETUP** section.

## Catalog and cart

- `GET /categories`
- `GET /businesses?q=&categoryId=`
- `GET /businesses/:slug`
- `GET /products?q=&categoryId=`
- `GET /products/:id`
- `GET /cart` (JWT)
- `POST /cart/items` (JWT; `{ "productId": "…", "quantity": 1 }`)
- `PATCH /cart/items/:id` (JWT; `{ "quantity": 2 }`)
- `DELETE /cart/items/:id` (JWT)

Cart and catalog availability account for stock held by an active checkout reservation.
The product list response includes its category relation for homepage/category grouping; the home feed also consumes the public businesses, published events, and active Buy & Sell listing endpoints and does not fabricate empty catalog records.

## Customer commerce

- `POST /checkout/quote` (JWT): exact seller-grouped total. Body: `{ "fulfilment": "MY_DIU_DELIVERY" }` or `{ "fulfilment": "VENDOR_DELIVERY" }`.
- `POST /checkout/create` (JWT): accepts one of the two approved delivery models and a validated delivery address. Creates a 15-minute reservation, snapshots one order per seller, and creates one Razorpay payment order for the cart. The cart is cleared only after the provider order is created.
- `GET /checkout/pending` (JWT): returns the caller's active checkout for payment resumption.
- `POST /checkout/verify` (JWT): verifies checkout ownership, Razorpay signature, captured status, order, amount and currency with Razorpay's server API before consuming reserved stock and marking orders paid.
- `GET /orders` and `GET /orders/:id` (JWT; caller-owned records only).
- `POST /payments/webhooks/razorpay`: public provider endpoint; requires a valid `x-razorpay-signature` HMAC over the raw request body. Captured events are checked against Razorpay before order state changes.

Unpaid checkout reservations expire after 15 minutes and release inventory. A late captured payment is marked `REFUND_PENDING`; automated refunds and reconciliation are not implemented. Gateway credentials and webhook secret must be configured, and the included migration must be applied before runtime use. MY DIU delivery requires `MY_DIU_DELIVERY_FEE_PAISE`; vendor-managed delivery requires the business to support delivery and configure `vendorDeliveryFeePaise`. Vendor setting route: `PATCH /vendor/business/delivery-settings` (VENDOR JWT). A MY DIU delivery job is created only after payment is verified; vendor-managed orders remain in the vendor's order workflow.

## Other foundation routes

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- Vendor business/product/subscription routes.
- Delivery job feed, acceptance and status routes.
- Admin overview, pending-business and operational-role routes.

## Emergency contacts

- `GET /emergency-contacts?category=&q=`: public; returns only active, verified contacts. No authentication required.
- `GET /admin/emergency-contacts` (ADMIN/SUPER_ADMIN): list all records, including inactive/unverified entries.
- `POST /admin/emergency-contacts` (ADMIN/SUPER_ADMIN): add a contact with name, category, phone, HTTPS source URL, optional translated names/address/hours and optional verification state.
- `PATCH /admin/emergency-contacts/:id` (ADMIN/SUPER_ADMIN): edit, verify/revoke verification, or activate/deactivate; writes are recorded in the audit log.
- The website also has a seedless, government-source-backed fallback list so emergency numbers remain visible when API/database services are unavailable. This does not imply the API/database is operational.

## Buy & Sell classifieds (separate from Shopping)

- `GET /classifieds?q=&category=&locality=&condition=&minPricePaise=&maxPricePaise=`: public active, unexpired listings; maximum 100 results.
- `GET /classifieds/:id`: public detail with a privacy-limited seller profile.
- `GET /classifieds/sellers/:id`: public seller profile and active listings; never returns seller phone/email.
- `POST /classifieds` (JWT): create a listing with title, description, integer `pricePaise`, existing active `categoryId`, `ProductCondition`, locality and 1–6 HTTPS `photoUrls`. Listings last 30 days.
- `GET /classifieds/mine` (JWT): owner dashboard listing management; marks stale active/paused listings expired.
- `PATCH /classifieds/:id` (JWT, owner only): edit listing fields.
- `PATCH /classifieds/:id/status` (JWT, owner only): pause, resume or mark sold; expired listings must be renewed to publish again.
- `DELETE /classifieds/:id` (JWT, owner only): soft-remove a listing.
- `POST /classifieds/:id/renew` (JWT, owner only): renew an unsold, non-removed listing for 30 days.
- `POST /classifieds/:id/enquiries` (JWT): send a private buyer enquiry; sellers can reply using `PATCH /classifieds/enquiries/:id/reply`.
- `GET /classifieds/enquiries/mine` (JWT): caller's received/sent enquiries.
- `POST /classifieds/:id/reports` (JWT): submit one report per user/listing.
- `GET /admin/classifieds` and `PATCH /admin/classifieds/:id/status` (ADMIN/SUPER_ADMIN): review/manage listings.
- `GET /admin/classifieds/reports` and `PATCH /admin/classifieds/reports/:id` (ADMIN/SUPER_ADMIN): resolve (removes listing) or dismiss reports; actions are audited.

Classifieds are direct buyer–seller connections. They do not expose seller contact details, create orders, take payments or promise delivery. Photo upload is not implemented; only HTTPS image URLs are accepted. Listing expiry is reflected when seller listings are loaded; no background job scheduler is available yet.

## Events

- `GET /events`: published future events and ticket-category metadata. Ticket ordering/payment is not implemented; the website therefore does not show a purchase button.

All protected routes must enforce JWT authentication, role/permission authorization, ownership boundaries and DTO validation. Detailed route ownership and remaining domains are tracked in [API-ROADMAP.md](api/API-ROADMAP.md).
