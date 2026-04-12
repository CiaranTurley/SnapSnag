/**
 * Loops.so email helper — all transactional emails and sequence triggers go here.
 *
 * Loops handles timing, retries, and unsubscribes automatically.
 * We only need to (a) upsert a contact so Loops knows the user, and
 * (b) send a single event or transactional email call.
 *
 * Set LOOPS_API_KEY in your environment variables.
 */

import { LoopsClient } from 'loops'

function getClient() {
  return new LoopsClient(process.env.LOOPS_API_KEY!)
}

// ─── Contact upsert ──────────────────────────────────────────────────────────
// Call on signup and whenever you know more about the user.

export async function upsertContact(
  email: string,
  props: {
    name?: string
    country?: string
    isExpert?: boolean
    userId?: string
  } = {}
) {
  try {
    const loops = getClient()
    await loops.createContact({
      email,
      properties: {
        firstName: props.name ?? '',
        country: props.country ?? '',
        isExpert: props.isExpert ?? false,
        userId: props.userId ?? '',
      },
    })
  } catch (err) {
    // Non-fatal — log and continue
    console.error('[loops] upsertContact error:', err)
  }
}

// ─── EMAIL SEQUENCE 1: After first purchase ──────────────────────────────────
// Trigger: checkout.session.completed (one-time payment)
// Loops handles email timing from this single event trigger.

export async function triggerPurchaseSequence(params: {
  email: string
  name: string
  inspectionId: string
  address: string
  reportUrl: string
  country: string
}) {
  try {
    const loops = getClient()
    await loops.sendEvent({
      email: params.email,
      eventName: 'purchase_completed',
      eventProperties: {
        name: params.name,
        inspectionId: params.inspectionId,
        address: params.address,
        reportUrl: params.reportUrl,
        country: params.country,
      },
    })
  } catch (err) {
    console.error('[loops] triggerPurchaseSequence error:', err)
  }
}

// ─── EMAIL SEQUENCE 2: Expert subscription cancelled ─────────────────────────
// Trigger: customer.subscription.deleted

export async function triggerExpertCancelledSequence(params: {
  email: string
  name: string
  couponCode?: string
}) {
  try {
    const loops = getClient()
    await loops.sendEvent({
      email: params.email,
      eventName: 'expert_cancelled',
      eventProperties: {
        name: params.name,
        couponCode: params.couponCode ?? '',
      },
    })
  } catch (err) {
    console.error('[loops] triggerExpertCancelledSequence error:', err)
  }
}

// ─── EMAIL SEQUENCE 3: Expert payment failed ─────────────────────────────────
// Trigger: invoice.payment_failed

export async function triggerExpertPaymentFailedSequence(params: {
  email: string
  name: string
  updatePaymentUrl: string
}) {
  try {
    const loops = getClient()
    await loops.sendEvent({
      email: params.email,
      eventName: 'payment_failed',
      eventProperties: {
        name: params.name,
        updatePaymentUrl: params.updatePaymentUrl,
      },
    })
  } catch (err) {
    console.error('[loops] triggerExpertPaymentFailedSequence error:', err)
  }
}

// ─── EMAIL SEQUENCE 4: Warranty reminder ─────────────────────────────────────
// Trigger: /api/warranty-reminder cron (replaces direct Resend call)

export async function triggerWarrantyReminder(params: {
  email: string
  name: string
  address: string
  expiryDateFormatted: string
  reportUrl: string
  verificationCode: string
}) {
  try {
    const loops = getClient()
    await loops.sendEvent({
      email: params.email,
      eventName: 'warranty_reminder',
      eventProperties: {
        name: params.name,
        address: params.address,
        expiryDate: params.expiryDateFormatted,
        reportUrl: params.reportUrl,
        verificationCode: params.verificationCode,
      },
    })
  } catch (err) {
    console.error('[loops] triggerWarrantyReminder error:', err)
  }
}

// ─── TRANSACTIONAL: Payment receipt ──────────────────────────────────────────
// Sent immediately after payment. transactionalId configured in Loops dashboard.

export async function sendReceiptEmail(params: {
  email: string
  name: string
  address: string
  amountFormatted: string
  reportUrl: string
  inspectionId: string
}) {
  try {
    const loops = getClient()
    await loops.sendTransactionalEmail({
      transactionalId: process.env.LOOPS_RECEIPT_EMAIL_ID!,
      email: params.email,
      dataVariables: {
        name: params.name,
        address: params.address,
        amount: params.amountFormatted,
        reportUrl: params.reportUrl,
        inspectionId: params.inspectionId,
      },
    })
  } catch (err) {
    console.error('[loops] sendReceiptEmail error:', err)
  }
}

// ─── TRANSACTIONAL: Refund confirmation ──────────────────────────────────────

export async function sendRefundEmail(params: {
  email: string
  name: string
  amountFormatted: string
  refundId: string
  address?: string
}) {
  try {
    const loops = getClient()
    await loops.sendTransactionalEmail({
      transactionalId: process.env.LOOPS_REFUND_EMAIL_ID!,
      email: params.email,
      dataVariables: {
        name: params.name,
        amount: params.amountFormatted,
        refundId: params.refundId,
        address: params.address ?? '',
      },
    })
  } catch (err) {
    console.error('[loops] sendRefundEmail error:', err)
  }
}

// ─── TRANSACTIONAL: Data deletion confirmation ────────────────────────────────

export async function sendDataDeletionEmail(params: {
  email: string
  name: string
}) {
  try {
    const loops = getClient()
    await loops.sendTransactionalEmail({
      transactionalId: process.env.LOOPS_DATA_DELETION_EMAIL_ID!,
      email: params.email,
      dataVariables: {
        name: params.name,
      },
    })
  } catch (err) {
    console.error('[loops] sendDataDeletionEmail error:', err)
  }
}

// ─── TRANSACTIONAL: Builder portal update ────────────────────────────────────
// Sent to the homebuyer when the builder updates a defect status.

export async function sendBuilderUpdateEmail(params: {
  email: string
  name: string
  address: string
  room: string
  itemDescription: string
  previousStatus: string
  newStatus: string
  builderNote?: string
  reportUrl: string
}) {
  try {
    const loops = getClient()
    await loops.sendTransactionalEmail({
      transactionalId: process.env.LOOPS_BUILDER_UPDATE_EMAIL_ID!,
      email: params.email,
      dataVariables: {
        name: params.name,
        address: params.address,
        room: params.room,
        itemDescription: params.itemDescription,
        previousStatus: params.previousStatus,
        newStatus: params.newStatus,
        builderNote: params.builderNote ?? '',
        reportUrl: params.reportUrl,
      },
    })
  } catch (err) {
    console.error('[loops] sendBuilderUpdateEmail error:', err)
  }
}
