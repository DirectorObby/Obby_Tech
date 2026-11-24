# Security Specification: OBBY TECH Cloud Firestore

## 1. Data Invariants
1. **Admin Authority Isolation**: Only verified `obbyitmasters@gmail.com` (`request.auth.token.email == 'obbyitmasters@gmail.com' && request.auth.token.email_verified == true`) or an existing UID in `/admins/{request.auth.uid}` (with `email_verified == true`) can create, update, or delete storefront catalog data (`/products`, `/categories`, `/services`, `/banners`, `/settings`, `/ai_instructions`) or mutate order/booking fulfillment statuses.
2. **PII Isolation**: User profiles (`/users/{userId}`), carts (`/carts/{userId}`), orders (`/orders/{orderId}`), bookings (`/bookings/{bookingId}`), and notifications (`/notifications/{notificationId}`) contain PII (`email`, `phone`, `street`, `address`) and are readable/listable ONLY by the owning UID (`resource.data.customerId == request.auth.uid` / `userId == request.auth.uid`) or verified admin (`isAdminEmail()`).
3. **Role Escalation Guard**: No customer can self-assign `role: 'admin'` on `/users/{userId}` or write to `/admins/{uid}`.
4. **Temporal & Immutability Guarantees**: `createdAt` must equal `request.time` on creation and remain immutable on update; `updatedAt` must equal `request.time` on both creation and update. `customerId` / `userId` ownership fields cannot change after creation.
5. **Terminal State Locking**: Once an order reaches `paymentStatus == 'PAID'` or a booking reaches `'COMPLETED'` / `'CANCELLED'`, customers cannot mutate it; only admin (`isAdmin()`) can override or correct states.
6. **Path & Resource Poisoning Guards**: Every document ID path variable is checked with `isValidId(id)` (`<= 128` chars, `^[a-zA-Z0-9_\-]+$`), every `string` field has an explicit `.size()` bound, and every `list` field has a `.size()` bound + index 0 type check when non-empty.
7. **Strict Key Allowlists**: Every `create` checks `hasAll(...) && hasOnly(...)`; every `update` runs `isValid[Entity](incoming())` AND `incoming().diff(existing()).affectedKeys().hasOnly(...)`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Role Escalation**: Non-admin user tries creating `/users/{uid}` with `role: "admin"`. Expected: `PERMISSION_DENIED`.
2. **Ghost Field Injection (Shadow Update)**: Attacker adds `isSuperAdmin: true` in `/products/{id}` or `/users/{uid}`. Expected: `PERMISSION_DENIED`.
3. **Unverified Admin Email Spoof**: Attacker signs in with email `obbyitmasters@gmail.com` where `email_verified == false` and writes to `/settings/store`. Expected: `PERMISSION_DENIED`.
4. **Public Read/List on PII**: Authenticated customer attempts `get` or `list` on another user's `/orders/{otherOrderId}` or `/users/{otherUid}`. Expected: `PERMISSION_DENIED`.
5. **ID Poisoning**: Attacker attempts creating `/products/..%2F..%2Fadmin_hack_long_string...` (invalid characters or `> 128` chars). Expected: `PERMISSION_DENIED`.
6. **Timestamp Forgery**: Client creates `/orders/{id}` with backdated `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`. Expected: `PERMISSION_DENIED`.
7. **Immortal Field Hijack**: Customer updates `/orders/{id}` attempting to reassign `customerId` to another user. Expected: `PERMISSION_DENIED`.
8. **State Shortcutting**: Customer updates own order setting `paymentStatus: "PAID"` and `deliveryStatus: "SHIPPED"`. Expected: `PERMISSION_DENIED`.
9. **Terminal State Bypass**: Customer updates `paymentMethod` after `paymentStatus` is already `"PAID"`. Expected: `PERMISSION_DENIED`.
10. **Array Exhaustion**: Attacker writes `items` array with 51+ elements or non-map element in `/carts/{uid}` or `/orders/{id}`. Expected: `PERMISSION_DENIED`.
11. **Value Poisoning (Denial of Wallet)**: Attacker writes a 1 MB string into `product.name` or `order.phone`. Expected: `PERMISSION_DENIED`.
12. **Orphaned Booking**: Verified user creates `/bookings/{id}` referencing non-existent `serviceId` (`!exists(/databases/$(database)/documents/services/$(incoming().serviceId))`). Expected: `PERMISSION_DENIED`.
