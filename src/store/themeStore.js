import { create } from 'zustand'

export const THEMES = ['light', 'dark', 'galactic']

const applyTheme = (theme) => {
  const root = document.documentElement
  root.classList.remove('dark', 'galactic')
  if (theme === 'dark') root.classList.add('dark')
  else if (theme === 'galactic') root.classList.add('galactic')
  localStorage.setItem('theme', theme)
}

const savedTheme = localStorage.getItem('theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const initialTheme = THEMES.includes(savedTheme) ? savedTheme : (prefersDark ? 'dark' : 'light')

applyTheme(initialTheme)

export const useThemeStore = create((set) => ({
  theme: initialTheme,
  isDark: initialTheme !== 'light',

  setTheme: (theme) =>
    set(() => {
      const next = THEMES.includes(theme) ? theme : 'light'
      applyTheme(next)
      return { theme: next, isDark: next !== 'light' }
    }),

  toggleTheme: () =>
    set((state) => {
      const next = THEMES[(THEMES.indexOf(state.theme) + 1) % THEMES.length]
      applyTheme(next)
      return { theme: next, isDark: next !== 'light' }
    }),
}))
