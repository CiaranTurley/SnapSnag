'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import SnapSnagLogo from '@/components/SnapSnagLogo'
import SnapBot from '@/components/SnapBot'
import {
  ChevronLeft, ChevronRight, LayoutGrid, Clock, Check, X, Minus,
  Camera, Mic, Plus, CheckCircle2, Circle, Square, Radio,
  List, Image as ImageIcon, AlertTriangle, Bot,
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
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [shareUrl,   setShareUrl]       = useState<string | null>(null)
  const [shareCopied, setShareCopied]   = useState(false)
  const [shareModalUrl, setShareModalUrl] = useState<string | null>(null)
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
  const [activeTab, setActiveTab]       = useState<'list' | 'photos' | 'fails' | 'bot'>('list')
  const [snapbotOpen, setSnapbotOpen]   = useState(false)

  const noteTimers   = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const timerRef     = useRef<ReturnType<typeof setInterval>>()
  const timerElapsed = useRef(0)
  const mediaRef      = useRef<MediaRecorder | null>(null)
  const chunksRef     = useRef<Blob[]>([])
  const recognitionRef = useRef<{ stop: () => void } | null>(null)
  const transcriptRef  = useRef<string>('')
  const photoInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
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
    if (response === 'fail') setSelectedItemId(item.id)

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
    cameraInputRef.current?.click()
  }

  function openGallery(itemId: string) {
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
    // Always open SnapBot first so user sees something happening
    setSnapbotOpen(false)
    setTimeout(() => setSnapbotOpen(true), 0)
    try {
      const res = await fetch(photoUrl)
      if (!res.ok) throw new Error('Photo fetch failed')
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
      // SnapBot is already open — user can ask questions manually
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
      const recMime = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm'
      const mr = new MediaRecorder(stream, { mimeType: recMime })
      mediaRef.current = mr

      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm'
        const ext = mimeType === 'audio/mp4' ? 'mp4' : 'webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const path = `${userId}/${inspection_id}/${itemId}/${Date.now()}.${ext}`
        const { data: uploaded } = await supabase.storage
          .from('voice-notes')
          .upload(path, blob, { contentType: mimeType })
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
    setSelectedItemId(null)
    setDrawerOpen(false)
    localStorage.setItem(ROOM_KEY(inspection_id), String(idx))
    window.scrollTo({ top: 0, behavior: 'instant' })
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

      {/* Hidden inputs — separate camera and gallery to fix iOS black screen */}
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelected} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelected} />

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
              const url = shareUrl || await (async () => {
                const res = await fetch('/api/view-token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ inspection_id }),
                })
                if (!res.ok) return null
                const { viewUrl } = await res.json()
                setShareUrl(viewUrl)
                return viewUrl as string
              })()
              if (!url) return
              try {
                await navigator.clipboard.writeText(url)
                setShareCopied(true)
                setTimeout(() => setShareCopied(false), 2000)
              } catch {
                setShareModalUrl(url)
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

      {/* ── PAYMENT REMINDER (first room only) ────────────────────────────── */}
      {currentRoomIdx === 0 && (
        <div className="fixed top-[108px] left-0 right-0 z-30 px-3 py-2">
          <div className="max-w-2xl mx-auto bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2 flex items-center gap-2">
            <span className="text-amber-400 text-sm">💡</span>
            <p className="font-grotesk text-xs text-amber-300/80">
              Free to complete — you only pay when you download your report.
            </p>
          </div>
        </div>
      )}

      {/* ── PHOTOS TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'photos' && (
        <div className={`flex-1 pb-24 px-3 ${currentRoomIdx === 0 ? 'pt-[152px]' : 'pt-[108px]'}`}>
          <p className="font-grotesk text-xs text-white/30 mb-3">All photos this inspection</p>
          <div className="grid grid-cols-3 gap-2">
            {items.flatMap(i => i.photos.map(url => ({ url, item: i }))).map(({ url, item }, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                  <p className="font-grotesk text-[9px] text-white/70 truncate">{item.item_description}</p>
                </div>
              </div>
            ))}
            {items.flatMap(i => i.photos).length === 0 && (
              <div className="col-span-3 text-center py-16">
                <Camera size={32} className="text-white/20 mx-auto mb-3" />
                <p className="font-grotesk text-sm text-white/30">No photos yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FAILS TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'fails' && (
        <div className={`flex-1 pb-24 px-3 space-y-3 ${currentRoomIdx === 0 ? 'pt-[152px]' : 'pt-[108px]'}`}>
          <p className="font-grotesk text-xs text-white/30 mb-1">Failed items across all rooms</p>
          {items.filter(i => i.response === 'fail').length === 0 ? (
            <div className="text-center py-16">
              <Check size={32} className="text-white/20 mx-auto mb-3" />
              <p className="font-grotesk text-sm text-white/30">No failed items yet</p>
            </div>
          ) : (
            items.filter(i => i.response === 'fail').map(item => (
              <div key={item.id} className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-grotesk text-sm font-medium text-white">{item.item_description}</p>
                  {item.severity && (
                    <span className="flex-shrink-0 text-xs font-grotesk font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: item.severity === 'critical' ? 'rgba(255,77,79,0.2)' : item.severity === 'major' ? 'rgba(255,107,53,0.2)' : 'rgba(255,179,64,0.2)',
                        color: item.severity === 'critical' ? '#FF4D4F' : item.severity === 'major' ? '#FF6B35' : '#FFB340',
                      }}>
                      {item.severity}
                    </span>
                  )}
                </div>
                <p className="font-grotesk text-xs text-white/40">{item.room}</p>
                {item.photos.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {item.photos.slice(0, 3).map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-white/10" />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── ITEMS LIST ────────────────────────────────────────────────────── */}
      {activeTab === 'list' && <div className={`flex-1 pb-28 px-3 space-y-2 ${currentRoomIdx === 0 ? 'pt-[152px]' : 'pt-[108px]'}`}>
        {room.items.map((item) => {
          const isSaved = savedIds.has(item.id)
          const hasDetails = item.photos.length > 0 || item.written_note || item.voice_note_url

          return (
            <div
              key={item.id}
              className="rounded-xl overflow-hidden border transition-all duration-200"
              style={{
                background: '#1C2840',
                borderColor: item.response === 'pass'
                  ? 'rgba(0,214,143,0.2)'
                  : item.response === 'fail'
                  ? 'rgba(255,77,79,0.2)'
                  : item.response === 'na'
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(255,255,255,0.06)',
              }}
            >
              {/* Tap-to-detail header */}
              <button
                onClick={() => setSelectedItemId(item.id)}
                className="w-full text-left px-4 pt-4 pb-3 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {item.is_custom && (
                    <span className="flex-shrink-0 mt-0.5 bg-snap-teal/20 text-snap-teal text-[9px] font-semibold px-1.5 py-0.5 rounded-full font-grotesk">
                      Custom
                    </span>
                  )}
                  <p className="font-grotesk font-medium text-[14px] leading-snug text-snap-white">
                    {item.item_description}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isSaved && <CheckCircle2 size={13} className="text-snap-pass" />}
                  {hasDetails && (
                    <span className="font-grotesk text-[10px] text-white/30">
                      {[
                        item.photos.length > 0 && `${item.photos.length}📷`,
                        item.voice_note_url && '🎙',
                        item.written_note && '📝',
                      ].filter(Boolean).join(' ')}
                    </span>
                  )}
                  {item.response === 'fail' && item.severity && (
                    <span className="text-[10px] font-grotesk font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: item.severity === 'critical' ? 'rgba(255,77,79,0.2)' : item.severity === 'major' ? 'rgba(255,107,53,0.2)' : 'rgba(255,179,64,0.2)',
                        color: item.severity === 'critical' ? '#FF4D4F' : item.severity === 'major' ? '#FF6B35' : '#FFB340',
                      }}>
                      {item.severity}
                    </span>
                  )}
                  {item.response === 'fail' && !item.severity && (
                    <span className="text-[10px] font-grotesk text-snap-fail/70">severity?</span>
                  )}
                  <ChevronRight size={14} className="text-white/20" />
                </div>
              </button>

              {/* Pass / Fail / NA buttons */}
              <div className="flex border-t border-white/5">
                <button
                  onClick={() => saveResponse(item, 'pass')}
                  className="flex-1 h-11 flex items-center justify-center gap-1.5 font-grotesk font-semibold text-sm transition-all"
                  style={{
                    background: item.response === 'pass' ? 'rgba(0,214,143,0.15)' : 'transparent',
                    color: item.response === 'pass' ? '#00D68F' : 'rgba(255,255,255,0.3)',
                    borderRight: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <Check size={14} strokeWidth={item.response === 'pass' ? 3 : 2} />
                  Pass
                </button>
                <button
                  onClick={() => saveResponse(item, 'fail')}
                  className="flex-1 h-11 flex items-center justify-center gap-1.5 font-grotesk font-semibold text-sm transition-all"
                  style={{
                    background: item.response === 'fail' ? 'rgba(255,77,79,0.15)' : 'transparent',
                    color: item.response === 'fail' ? '#FF4D4F' : 'rgba(255,255,255,0.3)',
                    borderRight: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <X size={14} strokeWidth={item.response === 'fail' ? 3 : 2} />
                  Fail
                </button>
                <button
                  onClick={() => saveResponse(item, 'na')}
                  className="flex-1 h-11 flex items-center justify-center gap-1.5 font-grotesk font-semibold text-sm transition-all"
                  style={{
                    background: item.response === 'na' ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: item.response === 'na' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                  }}
                >
                  <Minus size={14} strokeWidth={item.response === 'na' ? 3 : 2} />
                  N/A
                </button>
              </div>
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
      </div>}

      {/* ── ITEM DETAIL BOTTOM SHEET ──────────────────────────────────────── */}
      {selectedItemId && (() => {
        const item = items.find(i => i.id === selectedItemId)
        if (!item) return null
        return (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/60"
              onClick={() => setSelectedItemId(null)}
            />
            <div
              className="fixed left-0 right-0 bottom-0 z-50 flex flex-col rounded-t-2xl overflow-hidden"
              style={{ background: '#0F172A', maxHeight: '90vh', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Header */}
              <div className="flex items-start justify-between px-5 pt-2 pb-3 gap-3 flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <p className="font-grotesk text-[11px] text-white/35 mb-1">{item.room}</p>
                  <h3 className="font-fraunces font-bold text-[17px] leading-snug text-white">{item.item_description}</h3>
                </div>
                <button
                  onClick={() => setSelectedItemId(null)}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/50 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-5">

                {/* Pass / Fail / N/A */}
                <div className="flex gap-2">
                  {([
                    ['pass', 'Pass', <Check key="p" size={15} />, '#00D68F', 'rgba(0,214,143,0.15)'],
                    ['fail', 'Fail', <X key="f" size={15} />, '#FF4D4F', 'rgba(255,77,79,0.15)'],
                    ['na',   'N/A',  <Minus key="n" size={15} />, 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0.08)'],
                  ] as const).map(([val, label, icon, col, bg]) => (
                    <button
                      key={val}
                      onClick={() => saveResponse(item, val as Response)}
                      className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl font-grotesk font-semibold text-sm transition-all border"
                      style={{
                        background: item.response === val ? bg : 'rgba(255,255,255,0.04)',
                        borderColor: item.response === val ? col : 'rgba(255,255,255,0.08)',
                        color: item.response === val ? col : 'rgba(255,255,255,0.35)',
                      }}
                    >
                      {icon}{label}
                    </button>
                  ))}
                </div>

                {/* Severity (inline, only for fails) */}
                {item.response === 'fail' && (
                  <div>
                    <p className="font-grotesk text-xs text-white/40 mb-2 flex items-center gap-1">
                      Severity
                      {!item.severity && <span className="text-snap-fail font-semibold">· required</span>}
                    </p>
                    <div className="flex gap-2">
                      {([
                        ['minor',    'Minor',    '#FFB340'],
                        ['major',    'Major',    '#FF6B35'],
                        ['critical', 'Critical', '#FF4D4F'],
                      ] as const).map(([val, label, colour]) => (
                        <button
                          key={val}
                          onClick={() => saveSeverity(item.id, val)}
                          className="flex-1 py-3 rounded-xl font-grotesk text-sm font-semibold border transition-all"
                          style={{
                            borderColor: item.severity === val ? colour : 'rgba(255,255,255,0.08)',
                            background: item.severity === val ? `${colour}20` : 'rgba(255,255,255,0.04)',
                            color: item.severity === val ? colour : 'rgba(255,255,255,0.4)',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photos */}
                <div>
                  <p className="font-grotesk text-xs text-white/40 mb-2">Photos ({item.photos.length}/3)</p>
                  <div className="flex gap-2 flex-wrap">
                    {item.photos.map((url, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => deletePhoto(item, url)}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center"
                        >
                          <X size={9} className="text-white" />
                        </button>
                        <button
                          onClick={() => analyseWithSnapBot(url)}
                          className="absolute bottom-0 left-0 right-0 py-1 text-center font-bold"
                          style={{ fontSize: 7, background: 'rgba(0,201,167,0.85)', color: '#fff', lineHeight: '1.2' }}
                        >
                          Ask Bot
                        </button>
                      </div>
                    ))}
                    {item.photos.length < 3 && (
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => openCamera(item.id)}
                          className="w-20 h-9 rounded-lg border border-white/15 flex items-center justify-center gap-1 hover:border-snap-teal/40 transition-all"
                          style={{ background: 'rgba(0,201,167,0.08)' }}
                        >
                          <Camera size={13} className="text-snap-teal" />
                          <span className="font-grotesk text-[9px] text-snap-teal font-semibold">Camera</span>
                        </button>
                        <button
                          onClick={() => openGallery(item.id)}
                          className="w-20 h-9 rounded-lg border border-white/15 flex items-center justify-center gap-1 hover:border-white/30 transition-all"
                          style={{ background: 'rgba(255,255,255,0.04)' }}
                        >
                          <ImageIcon size={13} className="text-white/35" />
                          <span className="font-grotesk text-[9px] text-white/35 font-semibold">Gallery</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Voice note */}
                <div>
                  {item.voice_note_url ? (
                    <div className="bg-white/5 rounded-xl p-3 border border-white/08">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-grotesk text-xs text-white/40">Voice note</span>
                        <button
                          onClick={() => toggleRecording(item.id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg font-grotesk text-xs transition-all ${
                            recording === item.id
                              ? 'bg-snap-fail/20 text-snap-fail border border-snap-fail/30'
                              : 'bg-white/5 text-white/40 border border-white/10'
                          }`}
                        >
                          {recording === item.id ? <><Square size={10} /> Stop</> : <><Mic size={10} /> Re-record</>}
                        </button>
                      </div>
                      <audio controls src={item.voice_note_url} className="w-full h-8" />
                      {item.voice_note_transcript && (
                        <p className="font-grotesk text-xs text-white/40 mt-2 italic">"{item.voice_note_transcript}"</p>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => toggleRecording(item.id)}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border font-grotesk text-sm font-semibold transition-all ${
                        recording === item.id
                          ? 'border-snap-fail bg-snap-fail/15 text-snap-fail'
                          : 'border-white/10 bg-white/4 text-white/45 hover:border-white/20'
                      }`}
                    >
                      {recording === item.id ? (
                        <><div className="w-2 h-2 bg-snap-fail rounded-full animate-pulse" /><Square size={14} /> Stop recording</>
                      ) : (
                        <><Mic size={16} /> Add voice note</>
                      )}
                    </button>
                  )}
                </div>

                {/* Text note */}
                <div>
                  <p className="font-grotesk text-xs text-white/40 mb-2">Notes</p>
                  <textarea
                    className="w-full rounded-xl px-4 py-3 font-grotesk text-sm text-white placeholder:text-white/25 outline-none resize-none border border-white/08 focus:border-white/20 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                    rows={3}
                    placeholder="Add a note about this item…"
                    value={item.written_note ?? ''}
                    onChange={e => handleNoteChange(item.id, e.target.value)}
                  />
                </div>
              </div>
            </div>
          </>
        )
      })()}

      {/* ── BOTTOM TAB BAR ────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t"
        style={{ background: '#0A0F1A', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        {/* Room nav strip (list tab only) */}
        {activeTab === 'list' && (
          <div className="flex items-center gap-2 px-3 pt-2 pb-1">
            <button
              onClick={() => goToRoom(currentRoomIdx - 1)}
              disabled={currentRoomIdx === 0}
              className="flex items-center gap-1 font-grotesk text-xs text-white/40 disabled:opacity-20 hover:text-white transition-colors"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex-1 font-grotesk text-xs text-white/40 hover:text-white transition-colors text-center truncate"
            >
              {room.name} · {roomAnswered}/{room.items.length}
            </button>
            <button
              onClick={nextRoom}
              className="flex items-center gap-1 font-grotesk text-xs font-semibold"
              style={{ color: '#00C9A7' }}
            >
              {isLastRoom ? 'Finish →' : <>Next <ChevronRight size={14} /></>}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center">
          {([
            { id: 'list',   icon: <List size={20} />,          label: 'Checklist' },
            { id: 'photos', icon: <ImageIcon size={20} />,      label: 'Photos' },
            { id: 'fails',  icon: <AlertTriangle size={20} />, label: `Fails${items.filter(i => i.response === 'fail').length > 0 ? ` (${items.filter(i => i.response === 'fail').length})` : ''}` },
            { id: 'bot',    icon: <Bot size={20} />,           label: 'SnapBot' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'bot') { setSnapbotOpen(false); setTimeout(() => setSnapbotOpen(true), 0); return }
                setActiveTab(tab.id)
              }}
              className="flex-1 flex flex-col items-center gap-1 py-2 transition-colors"
              style={{ color: activeTab === tab.id ? '#00C9A7' : 'rgba(255,255,255,0.35)' }}
            >
              {tab.icon}
              <span className="font-grotesk text-[10px]">{tab.label}</span>
            </button>
          ))}
        </div>
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

      {/* ── SHARE MODAL (clipboard fallback) ──────────────────────────────── */}
      {shareModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShareModalUrl(null)} />
          <div className="relative w-full max-w-sm bg-snap-ink-mid rounded-2xl border border-white/10 p-6">
            <h2 className="font-fraunces text-lg font-bold mb-2">Share inspection link</h2>
            <p className="font-grotesk text-sm text-white/50 mb-4">Copy this link and send it to whoever you want to share your live inspection with.</p>
            <div className="flex items-center gap-2 bg-black/30 rounded-xl px-4 py-3 mb-4">
              <span className="font-grotesk text-xs text-white/70 break-all flex-1">{shareModalUrl}</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareModalUrl).catch(() => {})
                setShareCopied(true)
                setTimeout(() => { setShareCopied(false); setShareModalUrl(null) }, 1500)
              }}
              className="btn-primary w-full font-bold"
              style={{ fontWeight: 700 }}
            >
              {shareCopied ? '✓ Copied!' : 'Copy link'}
            </button>
          </div>
        </div>
      )}

      {/* ── SNAPBOT ───────────────────────────────────────────────────────── */}
      <SnapBot
        photoBase64={snapbotPhoto?.base64}
        photoMimeType={snapbotPhoto?.mimeType}
        onPhotoAnalysed={() => setSnapbotPhoto(null)}
        forceOpen={snapbotOpen}
        onClose={() => { setSnapbotOpen(false) }}
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
