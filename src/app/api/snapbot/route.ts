import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const COUNTRY_CONTEXT: Record<string, string> = {
  IE: 'Ireland',
  UK: 'United Kingdom',
  AU: 'Australia',
  US: 'United States',
  CA: 'Canada',
}

function buildSystemPrompt(country: string): string {
  const countryName = COUNTRY_CONTEXT[country] ?? 'Ireland'

  const countryKnowledge: Record<string, string> = {
    IE: 'Use Irish construction standards: ETCI wiring regulations, IS440, BER certificates, Irish Building Regulations.',
    UK: 'Use UK construction standards: 18th Edition IET wiring regulations, Building Regulations Parts, Gas Safe, EPC certificates.',
    AU: 'Use Australian construction standards: NCC (National Construction Code), BASIX, AS/NZS 3000 wiring rules, NatHERS rating, termite protection requirements.',
    US: 'Use US construction standards: NEC (National Electrical Code), IRC (International Residential Code), certificate of occupancy requirements.',
    CA: 'Use Canadian construction standards: CSA C22.1 electrical code, HRV requirements, EnerGuide rating system.',
  }

  return `You are SnapBot, the construction and snagging expert for the SnapSnag new home inspection app.

You ONLY answer questions about:
- Construction defects and what they mean
- Snagging and inspection of new build homes
- Construction quality standards
- New home buyer rights and how to deal with builders about defects
- What specific snags mean and their severity
- How to document defects properly
- Room-specific inspection advice
- Materials, finishes and construction methods

The user is in ${countryName}. ${countryKnowledge[country] ?? countryKnowledge['IE']}

Do NOT mention specific warranty programme names. Refer generically to "your builder" or "your builder's obligations" instead.

If asked ANYTHING outside construction, snagging or new homes, respond ONLY with:
"I can only help with construction and snagging questions. For other queries please use the Support button."

Tone: friendly, warm, knowledgeable. Like a helpful friend who is a builder.
Keep responses concise and practical. Use bullet points for lists.
When describing defects, always say whether it is minor, major or critical.
Always tell users to document defects with photos.`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, country = 'IE', history = [], imageBase64, imageMimeType } = body

    if (!message && !imageBase64) {
      return new Response(JSON.stringify({ error: 'Message or image required' }), { status: 400 })
    }

    // Build message history for multi-turn conversation
    type MessageParam = { role: 'user' | 'assistant'; content: string | Anthropic.ContentBlockParam[] }
    const messages: MessageParam[] = history.map((msg: { role: string; content: string }) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    // Build the current user message content
    let userContent: string | Anthropic.ContentBlockParam[]

    if (imageBase64 && imageMimeType) {
      // Photo analysis request
      const photoPrompt = message ||
        'This photo was taken during a new build inspection. Please describe what you can see, identify any potential defects or issues, and advise whether this should be marked as Pass, Fail (and if so, what severity: minor, major or critical), or N/A. Be specific and practical in your response.'

      userContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageMimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: imageBase64,
          },
        },
        { type: 'text', text: photoPrompt },
      ]
    } else {
      userContent = message
    }

    messages.push({ role: 'user', content: userContent })

    // Stream the response
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: buildSystemPrompt(country),
      messages,
    })

    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
              controller.enqueue(encoder.encode(chunk))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('SnapBot error:', err)
    return new Response(JSON.stringify({ error: 'SnapBot unavailable' }), { status: 500 })
  }
}
