'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Wrench, MessageSquare } from 'lucide-react'
import { useCountry } from '@/lib/CountryContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface SnapBotProps {
  /** Optional: pass a photo (base64 + mimeType) to trigger photo analysis */
  photoBase64?: string
  photoMimeType?: string
  /** Called after photo analysis is complete so parent can clear the photo */
  onPhotoAnalysed?: () => void
  /** Extra bottom offset in px — use when a fixed bottom bar would obscure the button */
  bottomOffset?: number
}

// ─── Opening message ──────────────────────────────────────────────────────────

const WARRANTY_NAMES: Record<string, string> = {
  IE: 'HomeBond',
  UK: 'NHBC Buildmark',
  AU: 'HBC Fund',
  US: 'Builder Warranty',
  CA: 'Tarion warranty',
}

function buildOpeningMessage(warrantyName: string): string {
  return `Hi! I'm SnapBot, your construction and snagging expert.

I can help you with questions about:
• Defects and what they mean
• Your ${warrantyName} warranty rights
• Building standards and regulations
• Dealing with your builder
• What to check in any room
• How to photograph defects properly

Ask me anything about your new home!`
}

// ─── Typing indicator ────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-snap-teal/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
        />
      ))}
    </div>
  )
}

// ─── Format timestamp ────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SnapBot({ photoBase64, photoMimeType, onPhotoAnalysed, bottomOffset = 20 }: SnapBotProps) {
  const { countryCode } = useCountry()
  const warrantyName = WARRANTY_NAMES[countryCode] ?? 'HomeBond'

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [unread, setUnread] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Typewriter effect state
  const [typedContent, setTypedContent] = useState('')
  const [typewriterActive, setTypewriterActive] = useState(false)
  const typeQueueRef = useRef('')
  const typeRunningRef = useRef(false)
  const typedAccRef = useRef('')

  // Watch incoming message content and feed typewriter queue
  useEffect(() => {
    if (!streaming) return
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'assistant') return
    const newChars = lastMsg.content.slice(typedAccRef.current.length + typeQueueRef.current.length)
    if (!newChars) return
    typeQueueRef.current += newChars
    if (!typeRunningRef.current) {
      typeRunningRef.current = true
      setTypewriterActive(true)
      const tick = () => {
        if (typeQueueRef.current.length === 0) {
          typeRunningRef.current = false
          setTypewriterActive(false)
          return
        }
        const take = Math.min(3, typeQueueRef.current.length)
        const chars = typeQueueRef.current.slice(0, take)
        typeQueueRef.current = typeQueueRef.current.slice(take)
        typedAccRef.current += chars
        setTypedContent(prev => prev + chars)
        setTimeout(tick, 22)
      }
      tick()
    }
  }, [messages, streaming])

  // Drain remaining queue after streaming ends
  useEffect(() => {
    if (streaming) return
    if (typeRunningRef.current || typeQueueRef.current.length === 0) return
    typeRunningRef.current = true
    setTypewriterActive(true)
    const tick = () => {
      if (typeQueueRef.current.length === 0) {
        typeRunningRef.current = false
        setTypewriterActive(false)
        return
      }
      const take = Math.min(3, typeQueueRef.current.length)
      const chars = typeQueueRef.current.slice(0, take)
      typeQueueRef.current = typeQueueRef.current.slice(take)
      typedAccRef.current += chars
      setTypedContent(prev => prev + chars)
      setTimeout(tick, 22)
    }
    tick()
  }, [streaming])

  // Scroll to bottom as typewriter types and when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, typedContent, scrollToBottom])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Show opening message when first opened
  const handleOpen = useCallback(() => {
    setOpen(true)
    setUnread(false)
    if (!hasOpened) {
      setHasOpened(true)
      setMessages([
        {
          role: 'assistant',
          content: buildOpeningMessage(warrantyName),
          timestamp: new Date(),
        },
      ])
    }
  }, [hasOpened, warrantyName])

  // Auto-open and analyse when a photo is passed
  useEffect(() => {
    if (photoBase64 && photoMimeType) {
      handleOpen()
      sendMessage('', photoBase64, photoMimeType)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoBase64, photoMimeType])

  // ── Core send function ───────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string, imgBase64?: string, imgMimeType?: string) => {
      const userText = text.trim()
      if (!userText && !imgBase64) return
      if (streaming) return

      // Append user message
      const userMsg: Message = {
        role: 'user',
        content: userText || '📷 Analysing this photo…',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setStreaming(true)
      // Reset typewriter for new message
      typeQueueRef.current = ''
      typedAccRef.current = ''
      typeRunningRef.current = false
      setTypedContent('')

      // Build history (exclude the opening assistant message if it's first)
      const history = messages
        .filter((m) => !(m.role === 'assistant' && messages.indexOf(m) === 0 && !hasOpened))
        .map((m) => ({ role: m.role, content: m.content }))

      // Placeholder for streaming assistant reply
      const botMsg: Message = { role: 'assistant', content: '', timestamp: new Date() }
      setMessages((prev) => [...prev, botMsg])

      try {
        abortRef.current = new AbortController()

        const res = await fetch('/api/snapbot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userText,
            country: countryCode,
            history,
            imageBase64: imgBase64,
            imageMimeType: imgMimeType,
          }),
          signal: abortRef.current.signal,
        })

        if (!res.ok) throw new Error('SnapBot API error')

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                accumulated += parsed.text
                setMessages((prev) => {
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: accumulated,
                  }
                  return updated
                })
              }
            } catch {
              // ignore partial JSON
            }
          }
        }

        if (onPhotoAnalysed && imgBase64) onPhotoAnalysed()
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: 'Sorry, I had trouble connecting. Please try again.',
          }
          return updated
        })
      } finally {
        setStreaming(false)
        if (!open) setUnread(true)
      }
    },
    [streaming, messages, countryCode, open, hasOpened, onPhotoAnalysed]
  )

  const handleSend = () => sendMessage(input)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Chat Window ───────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed right-4 z-50 flex flex-col overflow-hidden"
          style={{
            bottom: bottomOffset + 68,
            width: 'min(380px, calc(100vw - 32px))',
            height: 'min(520px, 60vh)',
            background: '#111827',
            border: '1px solid rgba(0,201,167,0.2)',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: '#0A0F1A', borderBottom: '1px solid rgba(0,201,167,0.15)' }}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ width: 36, height: 36, background: '#00C9A7' }}
              >
                <Wrench size={18} color="#0A0F1A" strokeWidth={2.5} />
              </div>
              <div>
                <p className="font-fraunces text-white font-bold text-sm leading-tight">SnapBot</p>
                <div className="flex items-center gap-1.5">
                  {/* Animated green dot */}
                  <span
                    className="rounded-full"
                    style={{
                      width: 7,
                      height: 7,
                      background: '#00D68F',
                      display: 'inline-block',
                      animation: 'pulse 2s infinite',
                    }}
                  />
                  <span className="text-xs" style={{ color: '#6B7280' }}>
                    Construction expert · Online
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg transition-colors"
              style={{ color: '#6B7280' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
              aria-label="Close SnapBot"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollBehavior: 'smooth' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div style={{ maxWidth: '85%' }}>
                  <div
                    className="px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                    style={
                      msg.role === 'user'
                        ? { background: '#00C9A7', color: '#0A0F1A' }
                        : { background: '#1C2840', color: '#FAFAF8' }
                    }
                  >
                    {(streaming || typewriterActive) && i === messages.length - 1
                      ? (typedContent || <TypingDots />)
                      : msg.content}
                  </div>
                  <p
                    className="text-xs mt-1"
                    style={{
                      color: '#4B5563',
                      textAlign: msg.role === 'user' ? 'right' : 'left',
                    }}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator while waiting for first chunk */}
            {streaming && messages.length > 0 && messages[messages.length - 1].content === '' && !typedContent && (
              <div className="flex justify-start">
                <div className="rounded-2xl" style={{ background: '#1C2840' }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="flex-shrink-0 p-3 flex items-end gap-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0F172A' }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a construction question…"
              disabled={streaming}
              rows={1}
              className="flex-1 resize-none rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                background: '#1C2840',
                color: '#FAFAF8',
                border: '1px solid rgba(255,255,255,0.08)',
                maxHeight: 100,
                lineHeight: '1.5',
                fontFamily: 'var(--font-space-grotesk)',
              }}
              onInput={(e) => {
                const t = e.currentTarget
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 100) + 'px'
              }}
            />
            <button
              onClick={handleSend}
              disabled={streaming || !input.trim()}
              className="rounded-xl p-2.5 flex-shrink-0 transition-opacity"
              style={{
                background: '#00C9A7',
                opacity: streaming || !input.trim() ? 0.4 : 1,
              }}
              aria-label="Send message"
            >
              <Send size={16} color="#0A0F1A" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* ── Floating Button ───────────────────────────────────────────────── */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className="fixed right-5 z-50 flex items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
        style={{
          bottom: bottomOffset,
          width: 56,
          height: 56,
          background: '#00C9A7',
          boxShadow: '0 0 20px rgba(0,201,167,0.4)',
          animation: open ? 'none' : 'snapbot-pulse 3s ease-in-out infinite',
        }}
        aria-label="Open SnapBot"
      >
        {open ? (
          <X size={22} color="#0A0F1A" strokeWidth={2.5} />
        ) : (
          <div className="relative">
            <MessageSquare size={22} color="#0A0F1A" strokeWidth={2.5} />
            {/* Mini wrench badge */}
            <div
              className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full"
              style={{ width: 14, height: 14, background: '#0A0F1A' }}
            >
              <Wrench size={8} color="#00C9A7" strokeWidth={2.5} />
            </div>
          </div>
        )}

        {/* Unread badge */}
        {unread && !open && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
            style={{ width: 18, height: 18, background: '#EF4444', fontSize: 10 }}
          >
            1
          </span>
        )}
      </button>

      {/* ── Keyframes ─────────────────────────────────────────────────────── */}
      <style jsx global>{`
        @keyframes snapbot-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(0, 201, 167, 0.4); }
          50% { box-shadow: 0 0 32px rgba(0, 201, 167, 0.7), 0 0 8px rgba(0, 201, 167, 0.3); }
        }
      `}</style>
    </>
  )
}
