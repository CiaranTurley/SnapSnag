'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Show only after 3rd visit
    const visits = parseInt(localStorage.getItem('snapsnag_visits') ?? '0', 10) + 1
    localStorage.setItem('snapsnag_visits', visits.toString())

    const dismissed = localStorage.getItem('snapsnag_pwa_dismissed')
    if (dismissed) return

    // Already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      if (visits >= 3) setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setVisible(false)
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    setVisible(false)
    localStorage.setItem('snapsnag_pwa_dismissed', '1')
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Install SnapSnag app"
      className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 rounded-2xl border border-snap-teal/30 shadow-2xl p-4"
      style={{ background: '#111827' }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-snap-teal flex items-center justify-center flex-shrink-0">
          <Download size={18} className="text-snap-ink" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-grotesk font-semibold text-sm text-white mb-0.5">
            Add SnapSnag to home screen
          </p>
          <p className="font-grotesk text-xs text-white/50 leading-relaxed">
            Inspect faster — works offline and opens instantly.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="text-white/30 hover:text-white transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center -mt-1 -mr-1"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleInstall}
          className="flex-1 btn-primary py-2 text-sm min-h-[44px]"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 py-2 rounded-xl border border-white/10 font-grotesk text-sm text-white/50 hover:text-white transition-colors min-h-[44px]"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
