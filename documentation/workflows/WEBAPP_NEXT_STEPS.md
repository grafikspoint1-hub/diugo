# MY DIU Web App — current implementation checkpoint

## Web-only architecture
One responsive browser application with customer, vendor, delivery partner and Super Admin workspaces. No native Android or iOS apps.

## Implemented source modules
- NestJS REST API, PostgreSQL/Prisma schema and Redis compose service.
- Customer registration/login and public catalogue endpoints.
- Vendor business submission and admin approval/rejection.
- Vendor product CRUD starter and vendor order list/status updates.
- Role guards for vendor, admin and delivery partner APIs.
- Customer cart CRUD and multi-vendor checkout quote.
- Checkout creates one pending-payment order per seller and creates delivery jobs when delivery is selected.
- Customer order history/detail.
- Delivery partner job list, atomic accept and state transition API.
- Admin overview, pending business queue, order list and operational partner role assignment.
- Browser API helper in `apps/website/prototypes/api-client.js` (prototype-only; shared client package migration is pending).

## Main API routes
- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/:id`
- `DELETE /api/v1/cart/items/:id`
- `POST /api/v1/checkout/quote`
- `POST /api/v1/checkout/create`
- `GET /api/v1/orders`, `GET /api/v1/orders/:id`
- `GET /api/v1/vendor/orders`, `PATCH /api/v1/vendor/orders/:id/status`
- `GET /api/v1/delivery/jobs`
- `PATCH /api/v1/delivery/jobs/:id/accept`
- `PATCH /api/v1/delivery/jobs/:id/status`
- `GET /api/v1/admin/orders`
- `PATCH /api/v1/admin/users/:id/role`

## Local setup
1. Install Node.js 20+ and Docker.
2. In `backend`, copy `.env.example` to `.env`; set a long random `JWT_SECRET`.
3. Run `docker compose up -d`.
4. Run `npm install`.
5. Run `npx prisma generate` and `npx prisma migrate dev --name init`.
6. Run `npm run start:dev`.
7. Test `GET http://localhost:4000/api/v1/health`.

## Critical limitations
- Payment gateway is not connected; checkout does not charge customers.
- Inventory is checked but not reserved/decremented; do not accept live orders.
- Delivery fee calculation and serviceability are not configured.
- Booking availability, partner calendars, hotel inventory and event ticket sales/QR scanning are not implemented.
- SMS/OTP, email/WhatsApp, maps/GPS, file storage and push notifications are not connected.
- No database migration was applied, no dependencies were installed, and no backend build/integration test was completed in this environment.
- Production deployment, domain setup, legal review, security assessment and monitoring remain outstanding.
