'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import SnapSnagLogo from '@/components/SnapSnagLogo'
import SnapBot from '@/components/SnapBot'
import {
  ChevronLeft, ChevronRight, LayoutGrid, Clock, Check, X, Minus,
  Camera, Mic, Pencil, Plus, CheckCircle2, Circle, MicOff, Square, Radio,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Response = 'pass' | 'fail' | 'na'
type Severity = 'minor' | 'major' | 'critical'

interface Item {
  id: string
  room: string
  room_order: number
  item_description: string
  item_order: number
  is_custom: boolean
  response: Response | null
  severity: Severity | null
  written_note: string | null
  voice_note_url: string | null
  voice_note_transcript: string | null
  photos: string[]
  annotated_photos: string[]
}

interface Inspection {
  id: string
  status: string
  inspector_name: string | null
  inspection_duration_minutes: number
  total_items: number
  passed_items: number
  failed_items: number
  na_items: number
  country: string
}

interface RoomGroup {
  name: string
  order: number
  items: Item[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}hr ${m}min`
  if (m > 0) return `${m}hr ${String(s).padStart(2, '0')}min`
  return `0hr ${String(s).padStart(2, '0')}min`
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1200
      let { width, height } = img
      if (width > MAX) { height = Math.round(height * MAX / width); width = MAX }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(b => { URL.revokeObjectURL(url); resolve(b!) }, 'image/jpeg', 0.82)
    }
    img.src = url
  })
}

const TIMER_KEY = (id: string) => `ss_timer_${id}`
const ROOM_KEY  = (id: string) => `ss_room_${id}`

// ─── Main component ────────────────────────────────────────────────────────────

export default function ChecklistPage({ params }: { params: { inspection_id: string } }) {
  const { inspection_id } = params
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseBrowserClient() as any

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading]           = useState(true)
  const [inspection, setInspection]     = useState<Inspection | null>(null)
  const [items, setItems]               = useState<Item[]>([])
  const [currentRoomIdx, setRoomIdx]    = useState(0)
  const [expandedId, setExpandedId]     = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [shareUrl,   setShareUrl]       = useState<string | null>(null)
  const [shareCopied, setShareCopied]   = useState(false)
  const [showWelcome, setShowWelcome]   = useState(false)
  const [addModal, setAddModal]         = useState(false)
  const [newItemText, setNewItemText]   = useState('')
  const [savedIds, setSavedIds]         = useState<Set<string>>(new Set())
  const [showSpeedWarn, setSpeedWarn]   = useState(false)
  const [timer, setTimer]               = useState(0)
  const [timerStarted, setTimerStarted] = useState(false)
  const [recording, setRecording]       = useState<string | null>(null) // itemId being recorded
  const [userId, setUserId]             = useState<string | null>(null)
  const [needsSeverity, setNeedsSeverity] = useState<string | null>(null)
  const [snapbotPhoto, setSnapbotPhoto] = useState<{ base64: string; mimeType: string } | null>(null)

  const noteTimers   = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const timerRef     = useRef<ReturnType<typeof setInterval>>()
  const timerElapsed = useRef(0)
  const mediaRef      = useRef<MediaRecorder | null>(null)
  const chunksRef     = useRef<Blob[]>([])
  const recognitionRef = useRef<{ stop: () => void } | null>(null)
  const transcriptRef  = useRef<string>('')
  const photoInputRef = useRef<HTMLInputElement>(null)
  const activePhotoItemId = useRef<string | null>(null)

  // ── Derived rooms ──────────────────────────────────────────────────────────
  const rooms = useMemo<RoomGroup[]>(() => {
    const map = new Map<number, RoomGroup>()
    for (const item of items) {
      if (!map.has(item.room_order)) {
        map.set(item.room_order, { name: item.room, order: item.room_order, items: [] })
      }
      map.get(item.room_order)!.items.push(item)
    }
    return Array.from(map.values())
      .sort((a, b) => a.order - b.order)
      .map(r => ({ ...r, items: r.items.sort((a, b) => a.item_order - b.item_order) }))
  }, [items])

  const currentRoom = rooms[currentRoomIdx]

  const totalAnswered = items.filter(i => i.response !== null).length
  const totalItems    = items.length

  // ── Load inspection + items ────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: insp } = await supabase
        .from('inspections')
        .select('id,status,inspector_name,inspection_duration_minutes,total_items,passed_items,failed_items,na_items,country')
        .eq('id', inspection_id)
        .eq('user_id', user.id)
        .single()

      if (!insp) { router.push('/dashboard'); return }
      setInspection(insp)

      const { data: rows } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('inspection_id', inspection_id)
        .order('room_order', { ascending: true })
        .order('item_order', { ascending: true })

      if (!rows) { setLoading(false); return }

      const parsed: Item[] = rows.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        room: r.room as string,
        room_order: r.room_order as number,
        item_description: r.item_description as string,
        item_order: r.item_order as number,
        is_custom: r.is_custom as boolean,
        response: r.response as Response | null,
        severity: r.severity as Severity | null,
        written_note: r.written_note as string | null,
        voice_note_url: r.voice_note_url as string | null,
        voice_note_transcript: r.voice_note_transcript as string | null,
        photos: Array.isArray(r.photos) ? r.photos as string[] : [],
        annotated_photos: Array.isArray(r.annotated_photos) ? r.annotated_photos as string[] : [],
      }))

      setItems(parsed)

      // Resume saved room
      const savedRoom = localStorage.getItem(ROOM_KEY(inspection_id))
      if (savedRoom) setRoomIdx(parseInt(savedRoom) || 0)

      // Show welcome back if some items answered
      const answered = parsed.filter(i => i.response !== null).length
      if (insp.status === 'in_progress' && answered > 0) {
        setShowWelcome(true)
      }

      // Resume timer
      const timerData = localStorage.getItem(TIMER_KEY(inspection_id))
      if (timerData) {
        try {
          const { elapsed, savedAt } = JSON.parse(timerData)
          const bonus = insp.status === 'in_progress' ? Math.floor((Date.now() - savedAt) / 1000) : 0
          const total = (elapsed ?? insp.inspection_duration_minutes * 60) + bonus
          setTimer(total)
          timerElapsed.current = total
          setTimerStarted(true)
        } catch {
          setTimer(insp.inspection_duration_minutes * 60)
          timerElapsed.current = insp.inspection_duration_minutes * 60
        }
      } else if (insp.inspection_duration_minutes > 0) {
        setTimer(insp.inspection_duration_minutes * 60)
        timerElapsed.current = insp.inspection_duration_minutes * 60
        setTimerStarted(true)
      }

      setLoading(false)
    }
    load()
  }, [inspection_id])

  // ── Timer interval ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerStarted) return
    timerRef.current = setInterval(() => {
      setTimer(t => {
        const next = t + 1
        timerElapsed.current = next
        // Persist every 15 seconds
        if (next % 15 === 0) {
          localStorage.setItem(TIMER_KEY(inspection_id), JSON.stringify({ elapsed: next, savedAt: Date.now() }))
          // Sync to Supabase every minute
          if (next % 60 === 0) {
            supabase.from('inspections').update({ inspection_duration_minutes: Math.floor(next / 60) }).eq('id', inspection_id)
          }
        }
        return next
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [timerStarted, inspection_id])

  function startTimer() {
    if (timerStarted) return
    setTimerStarted(true)
    localStorage.setItem(TIMER_KEY(inspection_id), JSON.stringify({ elapsed: timer, savedAt: Date.now() }))
  }

  // ── Update item in state ───────────────────────────────────────────────────
  function patchItem(id: string, patch: Partial<Item>) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  function flashSaved(id: string) {
    setSavedIds(s => new Set(s).add(id))
    setTimeout(() => setSavedIds(s => { const n = new Set(s); n.delete(id); return n }), 1200)
  }

  // ── Save response ──────────────────────────────────────────────────────────
  async function saveResponse(item: Item, response: Response) {
    startTimer()
    patchItem(item.id, { response, severity: response !== 'fail' ? null : item.severity })
    if (expandedId !== item.id) setExpandedId(item.id)

    await supabase.from('checklist_items').update({
      response,
      severity: response !== 'fail' ? null : item.severity,
    }).eq('id', item.id)

    flashSaved(item.id)

    // Update inspection counters
    const all = items.map(i => i.id === item.id ? { ...i, response } : i)
    await supabase.from('inspections').update({
      passed_items: all.filter(i => i.response === 'pass').length,
      failed_items: all.filter(i => i.response === 'fail').length,
      na_items:     all.filter(i => i.response === 'na').length,
    }).eq('id', inspection_id)
  }

  // ── Save severity ──────────────────────────────────────────────────────────
  async function saveSeverity(itemId: string, severity: Severity) {
    patchItem(itemId, { severity })
    setNeedsSeverity(null)
    await supabase.from('checklist_items').update({ severity }).eq('id', itemId)
    flashSaved(itemId)
  }

  // ── Save note (debounced) ──────────────────────────────────────────────────
  function handleNoteChange(itemId: string, text: string) {
    patchItem(itemId, { written_note: text })
    clearTimeout(noteTimers.current[itemId])
    noteTimers.current[itemId] = setTimeout(async () => {
      await supabase.from('checklist_items').update({ written_note: text }).eq('id', itemId)
      flashSaved(itemId)
    }, 500)
  }

  // ── Photo upload ───────────────────────────────────────────────────────────
  function openCamera(itemId: string) {
    activePhotoItemId.current = itemId
    photoInputRef.current?.click()
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const itemId = activePhotoItemId.current
    if (!file || !itemId || !userId) return

    const item = items.find(i => i.id === itemId)
    if (!item || item.photos.length >= 3) return

    const compressed = await compressImage(file)
    const path = `${userId}/${inspection_id}/${itemId}/${Date.now()}.jpg`

    const { data: uploaded } = await supabase.storage
      .from('inspection-photos')
      .upload(path, compressed, { contentType: 'image/jpeg' })

    if (!uploaded) return

    const { data: { publicUrl } } = supabase.storage
      .from('inspection-photos')
      .getPublicUrl(path)

    const newPhotos = [...item.photos, publicUrl]
    patchItem(itemId, { photos: newPhotos })
    await supabase.from('checklist_items').update({ photos: newPhotos }).eq('id', itemId)
    flashSaved(itemId)

    // Reset input
    e.target.value = ''
  }

  async function deletePhoto(item: Item, photoUrl: string) {
    const newPhotos = item.photos.filter(p => p !== photoUrl)
    patchItem(item.id, { photos: newPhotos })
    await supabase.from('checklist_items').update({ photos: newPhotos }).eq('id', item.id)
  }

  async function analyseWithSnapBot(photoUrl: string) {
    try {
      const res = await fetch(photoUrl)
      const blob = await res.blob()
      const mimeType = (blob.type || 'image/jpeg') as string
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      setSnapbotPhoto({ base64, mimeType })
    } catch {
      // silently ignore — SnapBot just won't open
    }
  }

  // ── Voice recording ────────────────────────────────────────────────────────
  async function toggleRecording(itemId: string) {
    if (recording === itemId) {
      // Stop recording + transcription
      try { mediaRef.current?.stop() } catch { /* ignore */ }
      try { recognitionRef.current?.stop() } catch { /* ignore */ }
      recognitionRef.current = null
      setRecording(null)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mediaRef.current = mr

      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const path = `${userId}/${inspection_id}/${itemId}/${Date.now()}.webm`
        const { data: uploaded } = await supabase.storage
          .from('voice-notes')
          .upload(path, blob, { contentType: 'audio/webm' })
        if (!uploaded) return
        const { data: { publicUrl } } = supabase.storage.from('voice-notes').getPublicUrl(path)
        const transcript = transcriptRef.current.trim() || null

        // Auto-populate written note with transcript if note is empty
        const currentItem = items.find(i => i.id === itemId)
        const existingNote = currentItem?.written_note?.trim() || ''
        const newNote = existingNote
          ? existingNote
          : (transcript || '')

        const updatePayload: Record<string, unknown> = {
          voice_note_url: publicUrl,
          voice_note_transcript: transcript,
        }
        if (!existingNote && transcript) {
          updatePayload.written_note = transcript
        }

        patchItem(itemId, {
          voice_note_url: publicUrl,
          voice_note_transcript: transcript,
          written_note: newNote || currentItem?.written_note || null,
        })
        await supabase.from('checklist_items')
          .update(updatePayload)
          .eq('id', itemId)
        flashSaved(itemId)
      }

      // ── Web Speech API for live transcript ────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SR) {
        transcriptRef.current = ''
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition = new SR() as any
        recognition.continuous = true
        recognition.interimResults = false
        recognition.onresult = (e: { resultIndex: number; results: SpeechRecognitionResultList }) => {
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) transcriptRef.current += e.results[i][0].transcript + ' '
          }
        }
        recognitionRef.current = recognition
        recognition.start()
      }

      mr.start()
      setRecording(itemId)
    } catch {
      alert('Microphone permission denied. Please allow microphone access in your browser settings.')
    }
  }

  // ── Add custom item ────────────────────────────────────────────────────────
  async function addCustomItem() {
    if (!newItemText.trim() || !currentRoom) return

    const maxOrder = Math.max(...currentRoom.items.map(i => i.item_order), 0)
    const { data } = await supabase.from('checklist_items').insert({
      inspection_id,
      room: currentRoom.name,
      room_order: currentRoom.order,
      item_description: newItemText.trim(),
      item_order: maxOrder + 1,
      is_custom: true,
    }).select('*').single()

    if (data) {
      const newItem: Item = {
        id: data.id,
        room: data.room,
        room_order: data.room_order,
        item_description: data.item_description,
        item_order: data.item_order,
        is_custom: true,
        response: null, severity: null, written_note: null,
        voice_note_url: null, voice_note_transcript: null,
        photos: [], annotated_photos: [],
      }
      setItems(prev => [...prev, newItem])
      await supabase.from('inspections').update({ total_items: items.length + 1 }).eq('id', inspection_id)
    }

    setNewItemText('')
    setAddModal(false)
  }

  // ── Room navigation ────────────────────────────────────────────────────────
  function goToRoom(idx: number) {
    setRoomIdx(idx)
    setExpandedId(null)
    setDrawerOpen(false)
    localStorage.setItem(ROOM_KEY(inspection_id), String(idx))
  }

  function nextRoom() {
    if (currentRoomIdx === rooms.length - 1) {
      // Last room — check speed
      if (timer < 45 * 60) { setSpeedWarn(true); return }
      completeInspection()
    } else {
      goToRoom(currentRoomIdx + 1)
    }
  }

  async function completeInspection() {
    await supabase.from('inspections').update({
      status: 'completed',
      inspection_duration_minutes: Math.floor(timer / 60),
    }).eq('id', inspection_id)
    localStorage.removeItem(TIMER_KEY(inspection_id))
    localStorage.removeItem(ROOM_KEY(inspection_id))
    router.push(`/inspect/${inspection_id}/complete`)
  }

  // ── Room completion stats ──────────────────────────────────────────────────
  function roomStatus(room: RoomGroup): 'complete' | 'partial' | 'empty' {
    const answered = room.items.filter(i => i.response !== null).length
    if (answered === 0) return 'empty'
    if (answered === room.items.length) return 'complete'
    return 'partial'
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-snap-ink flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-snap-teal border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-grotesk text-sm text-white/40">Loading checklist…</p>
        </div>
      </div>
    )
  }

  if (!inspection || rooms.length === 0) {
    return (
      <div className="min-h-screen bg-snap-ink flex items-center justify-center px-6">
        <div className="text-center">
          <p className="font-fraunces text-2xl font-bold mb-2">No checklist found</p>
          <p className="font-grotesk text-white/50 text-sm mb-6">This inspection has no items yet.</p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary">Back to dashboard</button>
        </div>
      </div>
    )
  }

  // ── Welcome back screen ────────────────────────────────────────────────────
  if (showWelcome) {
    const lastRoom = rooms.find(r => r.items.some(i => i.response !== null))
    return (
      <div className="min-h-screen bg-snap-ink flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center"><SnapSnagLogo size="sm" /></div>
          <div className="card border border-white/10 text-center">
            <div className="text-4xl mb-4">👋</div>
            <h1 className="font-fraunces text-2xl font-bold mb-2">Welcome back!</h1>
            <p className="font-grotesk text-white/50 text-sm mb-1">Your inspection is saved.</p>
            {lastRoom && (
              <p className="font-grotesk text-white/40 text-xs mb-1">Last in: <span className="text-snap-white">{lastRoom.name}</span></p>
            )}
            <p className="font-grotesk text-white/40 text-xs mb-1">
              Items completed: <span className="text-snap-white">{totalAnswered} of {totalItems}</span>
            </p>
            <p className="font-grotesk text-white/40 text-xs mb-8">
              Time so far: <span className="text-snap-white">{formatTimer(timer)}</span>
            </p>
            <button
              onClick={() => setShowWelcome(false)}
              className="btn-primary w-full min-h-[48px] mb-3 font-bold"
              style={{ fontWeight: 700 }}
            >
              Continue inspection
            </button>
            <button
              onClick={() => { goToRoom(0); setShowWelcome(false) }}
              className="font-grotesk text-sm text-white/40 hover:text-white/60"
            >
              Start from the beginning
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main checklist UI ──────────────────────────────────────────────────────
  const room = currentRoom
  const roomAnswered = room.items.filter(i => i.response !== null).length
  const isLastRoom = currentRoomIdx === rooms.length - 1

  return (
    <div className="min-h-screen bg-[#111827] text-snap-white flex flex-col">

      {/* Hidden photo input */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelected}
      />

      {/* ── FIXED HEADER ──────────────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-[#0A0F1A]/95 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center px-4 py-3 gap-3">
          {/* Back */}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white flex-shrink-0"
          >
            <ChevronLeft size={22} />
          </button>

          {/* Centre: room name + progress */}
          <div className="flex-1 min-w-0 text-center">
            <div className="font-fraunces font-bold text-base leading-tight truncate">{room.name}</div>
            <div className="font-grotesk text-xs text-white/40">
              Room {currentRoomIdx + 1} of {rooms.length}
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Clock size={12} className="text-white/30" />
            <span className="font-grotesk text-xs text-white/40">{formatTimer(timer)}</span>
          </div>

          {/* Share live */}
          <button
            onClick={async () => {
              if (shareUrl) {
                await navigator.clipboard.writeText(shareUrl)
                setShareCopied(true)
                setTimeout(() => setShareCopied(false), 2000)
                return
              }
              const res = await fetch('/api/view-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inspection_id }),
              })
              if (res.ok) {
                const { viewUrl } = await res.json()
                setShareUrl(viewUrl)
                await navigator.clipboard.writeText(viewUrl)
                setShareCopied(true)
                setTimeout(() => setShareCopied(false), 2000)
              }
            }}
            aria-label={shareCopied ? 'Link copied' : 'Share live inspection link'}
            className="flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0 min-h-[44px]"
            style={{ background: 'rgba(0,201,167,0.1)', color: '#00C9A7' }}
          >
            <Radio size={12} aria-hidden="true" />
            <span className="font-grotesk text-xs font-semibold">
              {shareCopied ? 'Copied!' : 'Share'}
            </span>
          </button>

          {/* Menu */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white flex-shrink-0"
          >
            <LayoutGrid size={20} />
          </button>
        </div>

        {/* Overall progress bar */}
        <div className="px-4 pb-1">
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-snap-teal rounded-full transition-all duration-500"
              style={{ width: totalItems > 0 ? `${(totalAnswered / totalItems) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Item counter */}
        <div className="px-4 pb-2 flex items-center justify-between">
          <span className="font-grotesk text-xs text-white/30">
            {roomAnswered} of {room.items.length} done in this room
          </span>
          <span className="font-grotesk text-xs text-white/30">
            {totalAnswered}/{totalItems} total
          </span>
        </div>
      </div>

      {/* ── ITEMS LIST ────────────────────────────────────────────────────── */}
      <div className="flex-1 pt-[108px] pb-24 px-3 space-y-3">
        {room.items.map((item) => {
          const isExpanded = expandedId === item.id
          const isSaved    = savedIds.has(item.id)

          return (
            <div
              key={item.id}
              className="rounded-xl border transition-all duration-200"
              style={{
                background: '#1C2840',
                borderColor: item.response === 'pass'
                  ? 'rgba(0,214,143,0.25)'
                  : item.response === 'fail'
                  ? 'rgba(255,77,79,0.25)'
                  : item.response === 'na'
                  ? 'rgba(255,255,255,0.1)'
                  : 'rgba(255,255,255,0.07)',
                padding: 16,
              }}
            >
              {/* Item description */}
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex items-start gap-2 flex-1">
                  {item.is_custom && (
                    <span className="flex-shrink-0 mt-0.5 bg-snap-teal/20 text-snap-teal text-[10px] font-semibold px-2 py-0.5 rounded-full font-grotesk">
                      Custom
                    </span>
                  )}
                  <p className="font-grotesk font-medium text-[15px] leading-relaxed text-snap-white">
                    {item.item_description}
                  </p>
                </div>
                {isSaved && (
                  <span className="flex-shrink-0 text-snap-pass text-xs font-grotesk flex items-center gap-1">
                    <CheckCircle2 size={12} /> Saved
                  </span>
                )}
              </div>

              {/* Pass / Fail / NA buttons */}
              <div className="flex gap-0 rounded-lg overflow-hidden mb-0">
                {/* PASS */}
                <button
                  onClick={() => saveResponse(item, 'pass')}
                  className="flex-1 h-12 flex items-center justify-center gap-1.5 font-grotesk font-semibold text-sm transition-all rounded-l-lg border"
                  style={{
                    background: item.response === 'pass' ? '#00D68F' : 'rgba(0,214,143,0.1)',
                    borderColor: 'rgba(0,214,143,0.2)',
                    color: item.response === 'pass' ? '#0A0F1A' : '#00D68F',
                  }}
                >
                  <Check size={15} />
                  Pass
                </button>

                {/* FAIL */}
                <button
                  onClick={() => saveResponse(item, 'fail')}
                  className="flex-1 h-12 flex items-center justify-center gap-1.5 font-grotesk font-semibold text-sm transition-all border-y"
                  style={{
                    background: item.response === 'fail' ? '#FF4D4F' : 'rgba(255,77,79,0.1)',
                    borderColor: 'rgba(255,77,79,0.2)',
                    color: item.response === 'fail' ? '#ffffff' : '#FF4D4F',
                    borderLeft: '1px solid rgba(255,77,79,0.2)',
                    borderRight: '1px solid rgba(255,77,79,0.2)',
                  }}
                >
                  <X size={15} />
                  Fail
                </button>

                {/* N/A */}
                <button
                  onClick={() => saveResponse(item, 'na')}
                  className="flex-1 h-12 flex items-center justify-center gap-1.5 font-grotesk font-semibold text-sm transition-all rounded-r-lg border"
                  style={{
                    background: item.response === 'na' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: item.response === 'na' ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  <Minus size={15} />
                  N/A
                </button>
              </div>

              {/* Expansion panel */}
              {isExpanded && (
                <div className="mt-4 space-y-4">

                  {/* Action buttons row */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openCamera(item.id)}
                      disabled={item.photos.length >= 3}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 font-grotesk text-xs text-white/60 hover:text-white hover:border-white/25 transition-all disabled:opacity-30"
                    >
                      <Camera size={14} />
                      Photo {item.photos.length > 0 && `(${item.photos.length}/3)`}
                    </button>
                    <button
                      onClick={() => toggleRecording(item.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border font-grotesk text-xs transition-all ${
                        recording === item.id
                          ? 'border-snap-fail bg-snap-fail/20 text-snap-fail'
                          : 'border-white/10 text-white/60 hover:text-white hover:border-white/25'
                      }`}
                    >
                      {recording === item.id ? <><Square size={12} /> Stop</> : <><Mic size={14} /> Voice</>}
                    </button>
                  </div>

                  {/* Severity (only for fails) */}
                  {item.response === 'fail' && (
                    <div>
                      <p className="font-grotesk text-xs text-white/40 mb-2">
                        Severity {!item.severity && <span className="text-snap-fail">— please select</span>}
                      </p>
                      <div className="flex gap-2">
                        {([
                          ['minor',    'Minor cosmetic', '#FFB340'],
                          ['major',    'Major defect',   '#FF6B35'],
                          ['critical', 'Critical issue',  '#FF4D4F'],
                        ] as const).map(([val, label, colour]) => (
                          <button
                            key={val}
                            onClick={() => saveSeverity(item.id, val)}
                            className="flex-1 py-2 rounded-lg font-grotesk text-xs font-semibold border transition-all"
                            style={{
                              borderColor: item.severity === val ? colour : 'rgba(255,255,255,0.1)',
                              background: item.severity === val ? `${colour}20` : 'rgba(255,255,255,0.03)',
                              color: item.severity === val ? colour : 'rgba(255,255,255,0.45)',
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Photo thumbnails */}
                  {item.photos.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {item.photos.map((url, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => deletePhoto(item, url)}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                          >
                            <X size={10} className="text-white" />
                          </button>
                          {/* Ask SnapBot about this photo */}
                          <button
                            onClick={() => analyseWithSnapBot(url)}
                            className="absolute bottom-0 left-0 right-0 py-1 text-center text-white font-bold transition-opacity"
                            style={{ fontSize: 8, background: 'rgba(0,201,167,0.85)', lineHeight: '1.2' }}
                            title="Ask SnapBot about this photo"
                          >
                            Ask SnapBot
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Voice note */}
                  {item.voice_note_url && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <audio controls src={item.voice_note_url} className="w-full h-8" />
                      {item.voice_note_transcript && (
                        <p className="font-grotesk text-xs text-white/50 mt-2 italic">
                          "{item.voice_note_transcript}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Recording indicator */}
                  {recording === item.id && (
                    <div className="flex items-center gap-2 bg-snap-fail/10 border border-snap-fail/20 rounded-lg p-3">
                      <div className="w-2 h-2 bg-snap-fail rounded-full animate-pulse" />
                      <span className="font-grotesk text-xs text-snap-fail">Recording — tap Stop when done</span>
                    </div>
                  )}

                  {/* Text note */}
                  <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-grotesk text-sm text-white placeholder:text-white/25 outline-none focus:border-white/25 resize-none"
                    rows={2}
                    placeholder="Add a note about this item…"
                    value={item.written_note ?? ''}
                    onChange={e => handleNoteChange(item.id, e.target.value)}
                  />
                </div>
              )}

              {/* Tap to expand hint */}
              {item.response !== null && !isExpanded && (
                <button
                  onClick={() => setExpandedId(item.id)}
                  className="mt-3 w-full font-grotesk text-xs text-white/25 hover:text-white/40 transition-colors text-center"
                >
                  {item.photos.length > 0 || item.written_note || item.voice_note_url
                    ? `📎 ${[item.photos.length > 0 && `${item.photos.length} photo${item.photos.length > 1 ? 's' : ''}`, item.written_note && 'note', item.voice_note_url && 'voice'].filter(Boolean).join(' · ')} — tap to view`
                    : 'Tap to add photo, note or voice…'}
                </button>
              )}
            </div>
          )
        })}

        {/* Add custom item */}
        <button
          onClick={() => setAddModal(true)}
          className="w-full rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 p-5 flex items-center justify-center gap-3 transition-all"
        >
          <Plus size={18} className="text-white/30" />
          <span className="font-grotesk text-sm text-white/30">Add your own check</span>
        </button>
      </div>

      {/* ── BOTTOM NAV ────────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 border-t"
        style={{ background: '#0A0F1A', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <button
          onClick={() => goToRoom(currentRoomIdx - 1)}
          disabled={currentRoomIdx === 0}
          className="flex items-center gap-1.5 font-grotesk text-sm text-white/50 disabled:opacity-20 hover:text-white transition-colors min-w-[100px]"
        >
          <ChevronLeft size={16} />
          Prev Room
        </button>

        <button
          onClick={() => setDrawerOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 font-grotesk text-sm text-white/50 hover:text-white transition-colors"
        >
          <LayoutGrid size={16} />
          Rooms
        </button>

        <button
          onClick={nextRoom}
          className="flex items-center gap-1.5 font-grotesk text-sm font-semibold min-w-[120px] justify-end"
          style={{ color: '#00C9A7' }}
        >
          {isLastRoom ? 'Finish →' : <>Next Room <ChevronRight size={16} /></>}
        </button>
      </div>

      {/* ── ROOM DRAWER ───────────────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="fixed left-0 top-0 bottom-0 z-50 w-[85vw] max-w-sm flex flex-col border-r border-white/10"
            style={{ background: '#0A0F1A' }}
          >
            <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
              <span className="font-fraunces text-lg font-bold">All rooms</span>
              <button onClick={() => setDrawerOpen(false)} className="text-white/50 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {rooms.map((r, idx) => {
                const status = roomStatus(r)
                const answered = r.items.filter(i => i.response !== null).length
                return (
                  <button
                    key={r.order}
                    onClick={() => goToRoom(idx)}
                    className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors text-left ${idx === currentRoomIdx ? 'bg-snap-teal/10' : ''}`}
                  >
                    {/* Status icon */}
                    <div className="flex-shrink-0">
                      {status === 'complete'
                        ? <CheckCircle2 size={20} className="text-snap-pass" />
                        : status === 'partial'
                        ? <div className="w-5 h-5 rounded-full border-2 border-snap-teal flex items-center justify-center">
                            <div className="w-2 h-2 bg-snap-teal rounded-full" />
                          </div>
                        : <Circle size={20} className="text-white/20" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-grotesk text-sm font-semibold truncate ${idx === currentRoomIdx ? 'text-snap-teal' : 'text-snap-white'}`}>
                        {r.name}
                      </p>
                      <p className="font-grotesk text-xs text-white/30">
                        {answered}/{r.items.length} items
                      </p>
                    </div>
                    {idx === currentRoomIdx && (
                      <div className="w-1.5 h-1.5 rounded-full bg-snap-teal flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="px-5 py-4 border-t border-white/5">
              <p className="font-grotesk text-xs text-white/30 text-center">
                {totalAnswered} of {totalItems} items completed
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── ADD CUSTOM ITEM MODAL ─────────────────────────────────────────── */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAddModal(false)} />
          <div className="relative w-full max-w-md bg-snap-ink-mid rounded-2xl border border-white/10 p-6">
            <h2 className="font-fraunces text-xl font-bold mb-4">Add your own check</h2>
            <textarea
              autoFocus
              className="input mb-4 resize-none"
              rows={3}
              placeholder="What do you want to check?"
              value={newItemText}
              onChange={e => setNewItemText(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setAddModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={addCustomItem}
                disabled={!newItemText.trim()}
                className="btn-primary flex-1 disabled:opacity-40"
              >
                Add to checklist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SNAPBOT ───────────────────────────────────────────────────────── */}
      <SnapBot
        photoBase64={snapbotPhoto?.base64}
        photoMimeType={snapbotPhoto?.mimeType}
        onPhotoAnalysed={() => setSnapbotPhoto(null)}
        bottomOffset={84}
      />

      {/* ── SPEED WARNING MODAL ───────────────────────────────────────────── */}
      {showSpeedWarn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-snap-ink-mid rounded-2xl border border-snap-amber/30 p-6 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="font-fraunces text-xl font-bold mb-3">Quick inspection detected</h2>
            <p className="font-grotesk text-sm text-white/60 leading-relaxed mb-6">
              You have been inspecting for <strong className="text-white">{formatTimer(timer)}</strong>.
              Professional surveys typically take 2–3 hours.
              Are you sure you have checked everything thoroughly?
            </p>
            <button
              onClick={completeInspection}
              className="btn-primary w-full mb-3 font-bold"
              style={{ fontWeight: 700 }}
            >
              Yes, I have finished
            </button>
            <button
              onClick={() => setSpeedWarn(false)}
              className="font-grotesk text-sm text-white/40 hover:text-white/60"
            >
              Go back and check again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
