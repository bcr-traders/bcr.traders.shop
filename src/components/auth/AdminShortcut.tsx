'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Secret shortcut for staff — Ctrl+Alt+A (Cmd+Alt+A on Mac) jumps to the
// admin login page from anywhere on the site. Nothing renders, nothing is
// linked anywhere, so there's nothing for a casual visitor or bot to find.
export default function AdminShortcut() {
  const router = useRouter()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if (isTyping) return

      if (e.altKey && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        router.push('/admin/login')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  return null
}
