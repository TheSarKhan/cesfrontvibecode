import { create } from 'zustand'
import { authApi } from '../api/auth'
import { isTokenExpired } from '../utils/jwt'

const parseUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user')) || null
  } catch {
    return null
  }
}

const validateTokens = () => {
  const accessToken = localStorage.getItem('accessToken')
  const refreshToken = localStorage.getItem('refreshToken')

  // Hər ikisi bitibsə — clear et
  if (accessToken && isTokenExpired(accessToken) && refreshToken && isTokenExpired(refreshToken)) {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    return false
  }

  return !!accessToken
}

export const useAuthStore = create((set, get) => ({
  user: parseUser(),
  accessToken: localStorage.getItem('accessToken') || null,
  isAuthenticated: validateTokens(),

  login: async (credentials) => {
    const { data } = await authApi.login(credentials)
    const { accessToken, refreshToken, user } = data.data

    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(user))

    set({ user, accessToken, isAuthenticated: true })
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {
      // silently ignore
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      set({ user: null, accessToken: null, isAuthenticated: false })
    }
  },

  hasPermission: (moduleCode, action = 'canGet') => {
    const { user } = get()
    if (!user) return false
    // No permissions data → show all (fallback for legacy sessions)
    if (!user.permissions) return true
    return user.permissions.some((p) => p.moduleCode === moduleCode && p[action])
  },
}))
