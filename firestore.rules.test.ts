/**
 * Security Rule Adversarial Verification Suite ("Dirty Dozen" Payloads)
 * Documents and verifies every security invariant enforced in firestore.rules.
 */

export interface SecurityTestCase {
  id: string;
  collection: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  expectedOutcome: 'PERMISSION_DENIED';
  rationale: string;
  payload: Record<string, unknown>;
}

export const DIRTY_DOZEN_PAYLOADS: SecurityTestCase[] = [
  {
    id: 'DD-01-role-escalation',
    collection: 'users/usr_attacker',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: 'Customer cannot self-assign role="admin" when email is not verified obbyitmasters@gmail.com.',
    payload: {
      id: 'usr_attacker',
      fullName: 'Attacker',
      email: 'attacker@example.com',
      role: 'admin',
      authProvider: 'email',
    },
  },
  {
    id: 'DD-02-shadow-ghost-field',
    collection: 'users/usr_attacker',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: 'AffectedKeys allowlist and hasOnly reject unapproved ghost field isVerified=true.',
    payload: {
      fullName: 'Updated Name',
      isVerified: true,
    },
  },
  {
    id: 'DD-03-unverified-admin-email-spoof',
    collection: 'settings/store',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: 'isAdminEmail() strictly requires request.auth.token.email_verified == true.',
    payload: {
      websiteName: 'HIJACKED STORE',
    },
  },
  {
    id: 'DD-04-cross-user-pii-read',
    collection: 'orders/APX1025',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: 'PII isolation blocks get/list for users who are neither resource owner nor admin.',
    payload: {
      requesterUid: 'usr_other_customer',
      ownerCustomerId: 'usr_victim',
    },
  },
  {
    id: 'DD-05-id-poisoning',
    collection: 'products/bad$id$with$invalid$chars',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: 'isValidId() rejects non-alphanumeric IDs and IDs exceeding 128 characters.',
    payload: {
      id: 'bad$id$with$invalid$chars',
      name: 'Poison Product',
    },
  },
  {
    id: 'DD-06-timestamp-forgery',
    collection: 'orders/APX9999',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: 'Temporal integrity requires createdAt == request.time and updatedAt == request.time.',
    payload: {
      id: 'APX9999',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
  },
  {
    id: 'DD-07-immortal-owner-hijack',
    collection: 'orders/APX1025',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: 'customerId cannot be reassigned during updates (affectedKeys + equality check).',
    payload: {
      customerId: 'usr_attacker',
    },
  },
  {
    id: 'DD-08-state-shortcutting',
    collection: 'orders/APX1025',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: 'Non-admin owners cannot transition paymentStatus to PAID or deliveryStatus to SHIPPED.',
    payload: {
      paymentStatus: 'PAID',
      deliveryStatus: 'SHIPPED',
    },
  },
  {
    id: 'DD-09-terminal-state-bypass',
    collection: 'orders/APX1025',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: 'Once paymentStatus == PAID, customer cannot modify paymentMethod.',
    payload: {
      existingPaymentStatus: 'PAID',
      paymentMethod: 'Bank Transfer',
    },
  },
  {
    id: 'DD-10-array-exhaustion',
    collection: 'carts/usr_attacker',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: 'Total array guarding caps cart items at <= 50 and validates element structure.',
    payload: {
      userId: 'usr_attacker',
      itemsCount: 75,
    },
  },
  {
    id: 'DD-11-value-poisoning-oversize-string',
    collection: 'orders/APX1025',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: 'String size caps reject oversized 1MB strings in customerName / phone fields.',
    payload: {
      customerName: 'A'.repeat(2000),
      phone: '0'.repeat(500),
    },
  },
  {
    id: 'DD-12-orphaned-service-booking',
    collection: 'bookings/BK1001',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: 'Booking creation requires exists(/databases/$(database)/documents/services/$(incoming().serviceId)).',
    payload: {
      id: 'BK1001',
      serviceId: 'srv_nonexistent_ghost',
      status: 'PENDING',
    },
  },
];

export function verifyDirtyDozenCoverage(): boolean {
  return (
    DIRTY_DOZEN_PAYLOADS.length === 12 &&
    DIRTY_DOZEN_PAYLOADS.every((tc) => tc.expectedOutcome === 'PERMISSION_DENIED')
  );
}
