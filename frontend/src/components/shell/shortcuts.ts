import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useSession, useUI } from '@/stores/app'

/** Raccourcis clavier globaux. */
export function useGlobalShortcuts() {
  const nav = useNavigate()
  const { setPalette, setAsk, toggleNav, setShortcuts } = useUI()
  const me = useSession((s) => s.user)
  useEffect(() => {
    let g = false
    let gTimer: ReturnType<typeof setTimeout>
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette(!useUI.getState().paletteOpen)
        return
      }
      const el = e.target as HTMLElement
      if (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || e.metaKey || e.ctrlKey || e.altKey) return
      if (document.querySelector('[role="dialog"]')) return
      if (g) {
        g = false
        const map: Record<string, string> = { h: '/', s: '/sos', p: '/projets', d: '/decouvrir', c: '/classement' }
        if (map[e.key]) {
          e.preventDefault()
          nav(map[e.key])
        }
        return
      }
      if (e.key === 'g') {
        g = true
        clearTimeout(gTimer)
        gTimer = setTimeout(() => (g = false), 900)
      } else if (e.key === 'n' && me) {
        e.preventDefault()
        setAsk(true)
      } else if (e.key === '[') {
        toggleNav()
      } else if (e.key === '?') {
        setShortcuts(true)
      } else if (e.key === '/') {
        e.preventDefault()
        setPalette(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav, setPalette, setAsk, toggleNav, setShortcuts, me])
}

