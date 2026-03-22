import { create } from 'zustand'

const applyTheme = (dark) => {
  if (dark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem('theme', dark ? 'dark' : 'light')
}

const savedTheme = localStorage.getItem('theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const initialDark = savedTheme ? savedTheme === 'dark' : prefersDark

applyTheme(initialDark)

export const useThemeStore = create((set) => ({
  isDark: initialDark,

  toggleTheme: () =>
    set((state) => {
      const next = !state.isDark
      applyTheme(next)
      return { isDark: next }
    }),
}))
