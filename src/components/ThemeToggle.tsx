'use client'

import { useTheme } from '@/lib/ThemeContext'
import { Sun, Moon, Monitor } from 'lucide-react'

const OPTIONS = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light',  label: 'Light',  Icon: Sun    },
  { value: 'dark',   label: 'Dark',   Icon: Moon   },
] as const

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--snap-border)' }}>
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          aria-label={`Set theme to ${label}`}
          aria-pressed={theme === value}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 font-grotesk text-xs font-semibold transition-colors min-h-[44px]"
          style={
            theme === value
              ? { background: '#00C9A7', color: '#0A0F1A' }
              : { background: 'transparent', color: 'var(--snap-text-dim)' }
          }
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  )
}
