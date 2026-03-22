import { useEffect } from 'react'

export function usePageShortcuts({ onNew, searchRef } = {}) {
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName
      const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable
      if (isEditing) return

      if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        onNew?.()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        searchRef?.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onNew, searchRef])
}
