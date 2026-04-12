'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Headphones, MessageCircle } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const OPENING_MESSAGE =
  `Hi! How can I help you today?

I can help with: payment issues, report problems, account questions, technical issues, and anything else about SnapSnag.`

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

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

// ─── Main component ───────────────────────────────────────────────────────────

export default function SupportChat() {
  const supabase = createSupabaseBrowserClient()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Fetch current user for context
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [supabase])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const handleOpen = useCallback(() => {
    setOpen(true)
    setUnread(false)
    if (!hasOpened) {
      setHasOpened(true)
      setMessages([{ role: 'assistant', content: OPENING_MESSAGE, timestamp: new Date() }])
    }
  }, [hasOpened])

  // Allow opening from footer link via hash
  useEffect(() => {
    if (window.location.hash === '#support') handleOpen()
    const listener = () => { if (window.location.hash === '#support') handleOpen() }
    window.addEventListener('hashchange', listener)
    return () => window.removeEventListener('hashchange', listener)
  }, [handleOpen])

  // ── Send message ─────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Build history (exclude opening assistant message)
    const history = messages
      .slice(hasOpened && messages[0]?.role === 'assistant' ? 1 : 0)
      .map(m => ({ role: m.role, content: m.content }))

    // Placeholder for reply
    const botMsg: Message = { role: 'assistant', content: '', timestamp: new Date() }
    setMessages(prev => [...prev, botMsg])

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          userId: userId ?? undefined,
          ticketId: ticketId ?? undefined,
          history,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.ticketId) setTicketId(data.ticketId)

      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: data.reply }
        return updated
      })

      if (!open) setUnread(true)
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'I had trouble connecting. Please try again or email support@snapsnag.ie',
        }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }, [loading, messages, userId, ticketId, open, hasOpened])

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
          className="fixed z-50 flex flex-col overflow-hidden"
          style={{
            bottom: '96px',
            right: '88px',
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
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ width: 36, height: 36, background: '#00C9A7' }}
              >
                <Headphones size={18} color="#0A0F1A" strokeWidth={2.5} />
              </div>
              <div>
                <p className="font-fraunces text-white font-bold text-sm leading-tight">Support</p>
                <div className="flex items-center gap-1.5">
                  <span
                    className="rounded-full"
                    style={{ width: 7, height: 7, background: '#00D68F', display: 'inline-block', animation: 'pulse 2s infinite' }}
                  />
                  <span className="text-xs" style={{ color: '#6B7280' }}>SnapSnag Support · Online 24/7</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg transition-colors"
              style={{ color: '#6B7280' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
              aria-label="Close support chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                    {msg.content || (loading && i === messages.length - 1 ? <TypingDots /> : '')}
                  </div>
                  <p
                    className="text-xs mt-1"
                    style={{ color: '#4B5563', textAlign: msg.role === 'user' ? 'right' : 'left' }}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {loading && messages.length > 0 && messages[messages.length - 1].content === '' && (
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
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your issue…"
              disabled={loading}
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
              onInput={e => {
                const t = e.currentTarget
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 100) + 'px'
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="rounded-xl p-2.5 flex-shrink-0 transition-opacity"
              style={{ background: '#00C9A7', opacity: loading || !input.trim() ? 0.4 : 1 }}
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
        className="fixed z-50 flex items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
        style={{
          width: 56,
          height: 56,
          bottom: 20,
          right: 88,
          background: '#1C2840',
          border: '2px solid rgba(0,201,167,0.4)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}
        aria-label="Open Support Chat"
      >
        {open ? (
          <X size={20} color="#00C9A7" strokeWidth={2.5} />
        ) : (
          <MessageCircle size={20} color="#00C9A7" strokeWidth={2.5} />
        )}

        {unread && !open && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
            style={{ width: 18, height: 18, background: '#EF4444', fontSize: 10 }}
          >
            1
          </span>
        )}
      </button>
    </>
  )
}
