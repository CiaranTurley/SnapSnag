'use client'

import { useState, useEffect } from 'react'
import { Gift, Copy, Check } from 'lucide-react'

export default function ReferralCard() {
  const [referralCode, setReferralCode]   = useState<string | null>(null)
  const [creditBalance, setCreditBalance] = useState(0)
  const [copied, setCopied]               = useState(false)

  useEffect(() => {
    fetch('/api/referral')
      .then(r => r.json())
      .then(d => {
        setReferralCode(d.referralCode)
        setCreditBalance(d.creditBalance ?? 0)
      })
      .catch(() => {})

    // Claim any referral code stored from ?ref= landing
    const stored = localStorage.getItem('snapsnag_ref')
    if (stored) {
      fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: stored }),
      }).then(() => localStorage.removeItem('snapsnag_ref')).catch(() => {})
    }
  }, [])

  async function handleCopy() {
    if (!referralCode) return
    const url = `${window.location.origin}/?ref=${referralCode}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card border border-white/5 mb-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-snap-teal/10 flex items-center justify-center flex-shrink-0">
          <Gift size={16} className="text-snap-teal" />
        </div>
        <div>
          <h2 className="font-fraunces text-base font-bold">Refer a friend</h2>
          <p className="font-grotesk text-xs text-white/40">
            Both get €5 credit when they complete their first inspection
          </p>
        </div>
        {creditBalance > 0 && (
          <div className="ml-auto text-right">
            <p className="font-fraunces text-lg font-bold text-snap-teal">
              €{(creditBalance / 100).toFixed(2)}
            </p>
            <p className="font-grotesk text-xs text-white/40">credit</p>
          </div>
        )}
      </div>

      {referralCode ? (
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 bg-white/3 hover:border-snap-teal/40 transition-colors group"
        >
          <div className="text-left">
            <p className="font-grotesk text-xs text-white/40 mb-0.5">Your referral link</p>
            <p className="font-grotesk text-sm font-semibold text-snap-teal">
              snapsnag.ie/?ref={referralCode}
            </p>
          </div>
          {copied
            ? <Check size={16} className="text-snap-teal flex-shrink-0" />
            : <Copy size={16} className="text-white/30 group-hover:text-white/60 flex-shrink-0" />}
        </button>
      ) : (
        <p className="font-grotesk text-xs text-white/30">
          Complete your first inspection to unlock your referral link.
        </p>
      )}
    </div>
  )
}
