'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'system' | 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'dark',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark')

  // Read from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('snapsnag-theme') as Theme | null
    if (stored) setThemeState(stored)
  }, [])

  // Apply theme to <html data-theme="...">
  useEffect(() => {
    const root = document.documentElement
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (theme === 'light') {
      root.setAttribute('data-theme', 'light')
      setResolvedTheme('light')
    } else if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark')
      setResolvedTheme('dark')
    } else {
      // system
      root.removeAttribute('data-theme')
      setResolvedTheme(systemDark ? 'dark' : 'light')
    }

    // Listen for system changes when in system mode
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function onChange(e: MediaQueryListEvent) {
      if (theme === 'system') setResolvedTheme(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem('snapsnag-theme', t)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
