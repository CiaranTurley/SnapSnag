'use client'

interface SnapSnagLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showTagline?: boolean
}

const sizes = {
  sm: { icon: 36, wordmark: 'text-xl', tagline: 'text-[8px]' },
  md: { icon: 48, wordmark: 'text-2xl', tagline: 'text-[9px]' },
  lg: { icon: 64, wordmark: 'text-4xl', tagline: 'text-xs' },
}

export default function SnapSnagLogo({ size = 'md', showTagline = false }: SnapSnagLogoProps) {
  const s = sizes[size]

  return (
    <div className="flex items-center gap-3" role="img" aria-label="SnapSnag — New Home Inspector">
      {/* Icon */}
      <div
        style={{
          width: s.icon,
          height: s.icon,
          borderRadius: 18 * (s.icon / 64),
          background: '#00C9A7',
          boxShadow: '0 0 40px rgba(0,201,167,0.35)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {/* Camera SVG */}
        <svg
          width={s.icon * 0.58}
          height={s.icon * 0.5}
          viewBox="0 0 32 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Camera body */}
          <rect x="1" y="7" width="30" height="20" rx="4" stroke="white" strokeWidth="2" fill="none" />
          {/* Shutter bump */}
          <path d="M10 7V5C10 3.9 10.9 3 12 3H20C21.1 3 22 3.9 22 5V7" stroke="white" strokeWidth="2" strokeLinecap="round" />
          {/* Lens outer circle */}
          <circle cx="16" cy="17" r="6" stroke="white" strokeWidth="2" fill="none" />
          {/* Lens inner filled circle */}
          <circle cx="16" cy="17" r="3" fill="white" />
        </svg>

        {/* Tick badge */}
        <div
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: s.icon * 0.38,
            height: s.icon * 0.38,
            borderRadius: '50%',
            background: '#0A0F1A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #0A0F1A',
          }}
        >
          <svg
            width={s.icon * 0.22}
            height={s.icon * 0.22}
            viewBox="0 0 12 12"
            fill="none"
          >
            <path d="M2 6L5 9L10 3" stroke="#00C9A7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Wordmark + tagline */}
      <div className="flex flex-col">
        <span className={`font-fraunces font-bold leading-none ${s.wordmark}`}>
          <span className="text-white">Snap</span>
          <span style={{ color: '#00C9A7' }}>Snag</span>
        </span>
        {showTagline && (
          <span
            className={`font-grotesk font-semibold tracking-[0.15em] uppercase opacity-50 mt-1 ${s.tagline}`}
            style={{ letterSpacing: '0.15em' }}
          >
            New Home Inspector
          </span>
        )}
      </div>
    </div>
  )
}
