import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { Resend } from 'resend'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'support@snapsnag.ie'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://snapsnag.ie'

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'issue_refund',
    description: 'Issue a refund for a payment. Only available for amounts under EUR50 (5000 cents). Verify the payment was genuine before calling this.',
    input_schema: {
      type: 'object' as const,
      properties: {
        payment_intent_id: { type: 'string', description: 'Stripe payment intent ID (starts with pi_)' },
        amount_cents: { type: 'number', description: 'Amount in cents to refund (max 5000)' },
        reason: { type: 'string', description: 'Reason for the refund' },
        inspection_id: { type: 'string', description: 'The inspection ID if known' },
      },
      required: ['payment_intent_id', 'amount_cents', 'reason'],
    },
  },
  {
    name: 'escalate_to_owner',
    description: 'Escalate a ticket to the owner for human review. Use for refunds over EUR50 or complex complaints.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: { type: 'string', description: 'Why this needs human attention' },
        ticket_id: { type: 'string', description: 'The support ticket ID' },
        urgency: { type: 'string', enum: ['normal', 'urgent'], description: 'How urgent this is' },
      },
      required: ['reason', 'ticket_id', 'urgency'],
    },
  },
  {
    name: 'legal_escalation',
    description: 'Trigger an urgent legal escalation to the owner. Use ONLY for legal threats or fraud allegations.',
    input_schema: {
      type: 'object' as const,
      properties: {
        summary: { type: 'string', description: 'Brief summary of the legal threat or fraud' },
        user_id: { type: 'string', description: 'The user ID if known' },
      },
      required: ['summary'],
    },
  },
  {
    name: 'regenerate_pdf',
    description: 'Regenerate the PDF report for an inspection. Use when a user reports their report is missing or corrupt.',
    input_schema: {
      type: 'object' as const,
      properties: {
        inspection_id: { type: 'string', description: 'The inspection ID' },
      },
      required: ['inspection_id'],
    },
  },
]

// ─── Tool execution ───────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ticketId: string,
  category: string,
): Promise<string> {
  try {
    if (name === 'issue_refund') {
      const res = await fetch(`${SITE_URL}/api/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) return JSON.stringify({ error: data.error })
      return JSON.stringify({ success: true, refund_id: data.refund_id, status: data.status })
    }

    if (name === 'escalate_to_owner') {
      const supabase = createSupabaseAdminClient()
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('user_email, messages, category')
        .eq('id', ticketId)
        .single()

      const subject = `SnapSnag Support Escalation - ${input.urgency} - ${ticket?.category ?? category}`
      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2>Support Escalation</h2>
          <p><strong>Urgency:</strong> ${input.urgency}</p>
          <p><strong>Ticket ID:</strong> ${ticketId}</p>
          <p><strong>User:</strong> ${ticket?.user_email ?? 'Unknown'}</p>
          <p><strong>Category:</strong> ${ticket?.category ?? category}</p>
          <p><strong>Reason:</strong> ${input.reason}</p>
          <h3>Conversation</h3>
          <pre style="background:#f4f4f4;padding:16px;border-radius:8px;white-space:pre-wrap;">${
            JSON.stringify(ticket?.messages ?? [], null, 2)
          }</pre>
          <p><a href="${SITE_URL}/admin">View in Admin Dashboard →</a></p>
        </div>
      `
      if (resend) await resend.emails.send({ from: 'SnapSnag Support <noreply@snapsnag.ie>', to: OWNER_EMAIL, subject, html })
      else console.log('[support] escalation email (no Resend):', subject)

      // Update ticket status
      await supabase.from('support_tickets').update({ status: 'escalated' }).eq('id', ticketId)
      return JSON.stringify({ success: true })
    }

    if (name === 'legal_escalation') {
      const supabase = createSupabaseAdminClient()
      const subject = 'URGENT: SnapSnag Legal Threat - Immediate attention required'
      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:2px solid red;padding:24px;border-radius:8px;">
          <h2 style="color:red;">⚠️ URGENT: Legal Threat / Fraud Alert</h2>
          <p><strong>Ticket ID:</strong> ${ticketId}</p>
          <p><strong>User ID:</strong> ${input.user_id ?? 'Unknown'}</p>
          <p><strong>Summary:</strong> ${input.summary}</p>
          <p><a href="${SITE_URL}/admin">View in Admin Dashboard →</a></p>
        </div>
      `
      if (resend) await resend.emails.send({ from: 'SnapSnag Support <noreply@snapsnag.ie>', to: OWNER_EMAIL, subject, html })
      else console.log('[support] LEGAL escalation (no Resend):', input.summary)

      await supabase.from('support_tickets').update({ status: 'escalated', category: 'legal' }).eq('id', ticketId)
      return JSON.stringify({ success: true })
    }

    if (name === 'regenerate_pdf') {
      const res = await fetch(`${SITE_URL}/api/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionId: input.inspection_id }),
      })
      if (!res.ok) return JSON.stringify({ error: 'PDF regeneration failed' })
      return JSON.stringify({ success: true, message: 'PDF regenerated — user can now re-download from their report page.' })
    }

    return JSON.stringify({ error: `Unknown tool: ${name}` })
  } catch (err) {
    console.error(`[support] Tool error (${name}):`, err)
    return JSON.stringify({ error: 'Tool execution failed' })
  }
}

// ─── Build system prompt with user context ────────────────────────────────────

function buildSystemPrompt(context: {
  userEmail?: string
  userName?: string
  inspections?: unknown[]
  payments?: unknown[]
}): string {
  return `You are the SnapSnag customer support assistant. You help users with issues related to the SnapSnag new-home snagging app.

${context.userEmail ? `USER CONTEXT:
- Email: ${context.userEmail}
- Name: ${context.userName ?? 'Unknown'}
- Inspections: ${JSON.stringify(context.inspections ?? [])}
- Payments: ${JSON.stringify(context.payments ?? [])}` : 'USER CONTEXT: Not logged in / anonymous user.'}

You CAN resolve these issues automatically:
1. Technical issues: diagnose and provide step-by-step fix instructions
2. Payment issues under EUR50: issue a refund using the issue_refund tool
3. Report not generating: trigger PDF regeneration using the regenerate_pdf tool
4. Account questions: answer using the account data above
5. General app questions: answer helpfully

For refunds under EUR50:
- Verify the purchase was genuine using the payment history above
- Issue refund via the issue_refund tool without asking for human approval
- Confirm: "I have processed your refund. It will appear in 3-5 business days."

For refunds over EUR50:
- Tell the user: "I am escalating this to our team who will respond within 24 hours."
- Use the escalate_to_owner tool with urgency "urgent"

For LEGAL THREATS or FRAUD:
- Do NOT try to resolve these
- Respond: "Thank you for raising this. Our team will review your case and respond within 2 business days."
- Immediately trigger the legal_escalation tool

AUTO-CATEGORISE every message as one of: technical / payment / complaint / question / legal / fraud
Include the category at the very end of your response in this exact format: [CATEGORY:technical]

Tone rules:
- Warm, empathetic and professional
- Never say "Unfortunately"
- Never say "I cannot help with that"
- Always offer an alternative or solution
- Keep responses concise — 2-4 short paragraphs maximum`
}

// ─── Category extraction ──────────────────────────────────────────────────────

function extractCategory(text: string): string {
  const match = text.match(/\[CATEGORY:(\w+)\]/)
  return match ? match[1] : 'question'
}

function stripCategory(text: string): string {
  return text.replace(/\s*\[CATEGORY:\w+\]\s*$/, '').trim()
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { message, userId, inspectionId, ticketId: existingTicketId, history = [] } = await req.json()

    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })

    const supabase = createSupabaseAdminClient()

    // ── Fetch user context ─────────────────────────────────────────────────────
    let userEmail: string | undefined
    let userName: string | undefined
    let inspections: unknown[] = []
    let payments: unknown[] = []

    if (userId) {
      const [{ data: profile }, { data: insp }, { data: pay }] = await Promise.all([
        supabase.from('users').select('name').eq('id', userId).single(),
        supabase
          .from('inspections')
          .select('id, property_address_line1, status, created_at, paid_at, stripe_session_id, failed_items, total_items')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.auth.admin.getUserById(userId),
      ])

      userEmail = pay.user?.email
      userName = (profile as { name?: string } | null)?.name
      inspections = insp ?? []

      // Fetch Stripe payment intents for paid inspections
      const paidInspections = (insp ?? []).filter((i: { stripe_session_id?: string }) => i.stripe_session_id)
      payments = paidInspections.map((i: { stripe_session_id?: string; paid_at?: string; property_address_line1?: string }) => ({
        inspection: i.property_address_line1,
        paid_at: i.paid_at,
        stripe_session_id: i.stripe_session_id,
      }))
    }

    // ── Build message history for Claude ───────────────────────────────────────
    type MsgParam = { role: 'user' | 'assistant'; content: string }
    const messages: MsgParam[] = [
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    // ── Tool-use agentic loop ──────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt({ userEmail, userName, inspections, payments })

    // We need ticketId before the loop so tools can reference it.
    // Create ticket upfront (or use existing).
    let ticketId = existingTicketId
    const allMessages = [...history, { role: 'user', content: message }]

    if (!ticketId) {
      const { data: ticket } = await supabase
        .from('support_tickets')
        .insert({
          user_id: userId ?? null,
          user_email: userEmail ?? null,
          inspection_id: inspectionId ?? null,
          category: 'question',
          messages: allMessages,
          status: 'open',
        })
        .select('id')
        .single()
      ticketId = ticket?.id
    } else {
      await supabase
        .from('support_tickets')
        .update({ messages: allMessages, updated_at: new Date().toISOString() })
        .eq('id', ticketId)
    }

    // Agentic loop
    let loopMessages: Anthropic.MessageParam[] = messages
    let loopResponse = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages: loopMessages,
    })

    let category = 'question'
    const MAX_ITERATIONS = 5
    let iterations = 0

    while (loopResponse.stop_reason === 'tool_use' && iterations < MAX_ITERATIONS) {
      iterations++
      const toolUseBlocks = loopResponse.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )

      loopMessages = [
        ...loopMessages,
        { role: 'assistant', content: loopResponse.content },
      ]

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (block) => ({
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            ticketId ?? '',
            category,
          ),
        }))
      )

      loopMessages = [...loopMessages, { role: 'user', content: toolResults }]

      loopResponse = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        tools: TOOLS,
        messages: loopMessages,
      })
    }

    // Extract final text reply
    const replyBlock = loopResponse.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
    const rawReply = replyBlock?.text ?? 'I am looking into this for you. Please give me a moment.'

    category = extractCategory(rawReply)
    const reply = stripCategory(rawReply)

    // ── Determine status ───────────────────────────────────────────────────────
    // If still open (no tool changed it), check if we resolved vs need followup
    const { data: currentTicket } = await supabase
      .from('support_tickets')
      .select('status')
      .eq('id', ticketId)
      .single()

    const finalStatus = currentTicket?.status === 'escalated' ? 'escalated' : 'open'

    // ── Save final ticket state ────────────────────────────────────────────────
    const finalMessages = [...allMessages, { role: 'assistant', content: reply }]
    await supabase
      .from('support_tickets')
      .update({
        messages: finalMessages,
        category,
        status: finalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)

    return NextResponse.json({ reply, ticketId, category })
  } catch (err) {
    console.error('[support] Error:', err)
    return NextResponse.json({ error: 'Support unavailable' }, { status: 500 })
  }
}
