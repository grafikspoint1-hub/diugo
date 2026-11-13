# API Roadmap

Base URL: `/api/v1`

| Domain | Planned endpoints | Access |
|---|---|---|
| Auth | POST `/auth/register`, POST `/auth/login`, GET `/auth/me` | Public / Customer |
| Categories | GET `/categories` | Public |
| Businesses | GET `/businesses`, GET `/businesses/:slug` | Public |
| Products | GET `/products`, GET `/products/:id` | Public |
| Vendor onboarding | POST `/vendor/applications`, GET `/vendor/profile` | Authenticated vendor |
| Vendor catalogue | POST/GET/PATCH/DELETE `/vendor/products`, PATCH `/vendor/inventory` | Approved vendor |
| Seller subscriptions | GET `/vendor/subscription`, POST `/vendor/subscription/checkout`, POST `/vendor/subscription/verify` | Approved vendor; Razorpay server verification |
| Cart | GET/POST/PATCH/DELETE `/cart/items` | Customer |
| Checkout | POST `/checkout/quote`, POST `/checkout/create` | Customer |
| Payments | POST `/payments/intent`, POST `/payments/webhooks/:provider` | Customer / Provider signature |
| Orders | GET `/orders`, GET `/orders/:id`, PATCH `/vendor/orders/:id/status` | Customer / Vendor |
| Bookings | GET `/booking-types`, GET `/availability`, POST `/bookings`, GET `/bookings/:id` | Public / Customer |
| Delivery | GET `/delivery/jobs`, POST `/delivery/jobs/:id/accept`, PATCH `/delivery/jobs/:id/status` | Delivery partner |
| Events | GET `/events`, GET `/events/:slug`, POST `/events/:id/tickets` | Public / Customer |
| Admin | `/admin/users`, `/admin/vendors`, `/admin/orders`, `/admin/refunds`, `/admin/reports` | Admin RBAC |
| Notifications | GET `/notifications`, PATCH `/notifications/:id/read` | Authenticated |

The table is a target API contract, not a claim that every route is implemented in this starter.


## Implemented in the current web-only checkpoint
- Cart: `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:id`, `DELETE /cart/items/:id`
- Checkout: `POST /checkout/quote`, `POST /checkout/create` (creates one pending-payment order per vendor)
- Customer orders: `GET /orders`, `GET /orders/:id`
- Vendor orders: `GET /vendor/orders`, `PATCH /vendor/orders/:id/status`
- Delivery: `GET /delivery/jobs`, `PATCH /delivery/jobs/:id/accept`, `PATCH /delivery/jobs/:id/status`
- Admin orders: `GET /admin/orders`
- Vendor catalogue: `POST /vendor/products`, `GET /vendor/products`, `PATCH /vendor/products/:id`, `DELETE /vendor/products/:id` (delete deactivates the product to preserve order history)
- Seller subscription: `GET /vendor/subscription`, `POST /vendor/subscription/checkout`, `POST /vendor/subscription/verify`; price and period are environment-configured, and products/catalog/cart require a verified active subscription.

Customer checkout now creates a cart-wide Razorpay payment session and per-seller pending orders, with transactional stock reservations, callback and signed-webhook verification, idempotent payment handling, and 15-minute reservation expiry. Runtime use is blocked until Razorpay credentials and the database migration are configured. MY DIU and vendor delivery require their respective fee settings; dispatch policies and production integration testing remain outstanding. Automated refunds and reconciliation remain outstanding.

- Admin role provisioning: `PATCH /admin/users/:id/role` (admin may grant operational partner/support roles; this endpoint cannot grant ADMIN/SUPER_ADMIN)
