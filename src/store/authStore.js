import { create } from 'zustand'
import { authApi } from '../api/auth'
import { usersApi } from '../api/users'
import { isTokenExpired } from '../utils/jwt'

// Frontend canX action adları → backend ACTION suffiksi (MODULE:ACTION kodu üçün).
// Mövcud ~27 hasPermission(moduleCode, 'canX') çağırışı pozulmasın deyə saxlanılır.
const ACTION_MAP = {
  canGet: 'GET',
  canPost: 'POST',
  canPut: 'PUT',
  canDelete: 'DELETE',
  canSendToCoordinator: 'SEND_COORDINATOR',
  canSubmitOffer: 'SUBMIT_OFFER',
  canSendToAccounting: 'SEND_ACCOUNTING',
  canReturnToProject: 'RETURN_PROJECT',
  canApproveByPm: 'APPROVE_PM',
  canCheckDocuments: 'CHECK_DOCUMENTS',
  canDispatch: 'DISPATCH',
  canDeliver: 'DELIVER',
}

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

  refetchMe: async () => {
    try {
      const { data } = await usersApi.me()
      const fresh = data?.data || data
      if (!fresh) return null
      const current = get().user || {}
      const merged = {
        ...current,
        fullName: fresh.fullName,
        email: fresh.email,
        phone: fresh.phone,
        profileImage: fresh.profileImage,
        // İcazə/rol məlumatını da təzələ (rol dəyişikliyindən sonra)
        ...(fresh.permissions !== undefined ? { permissions: fresh.permissions } : {}),
        ...(fresh.roleName !== undefined ? { roleName: fresh.roleName } : {}),
        ...(fresh.roleNames !== undefined ? { roleNames: fresh.roleNames } : {}),
      }
      localStorage.setItem('user', JSON.stringify(merged))
      set({ user: merged })
      return merged
    } catch {
      return null
    }
  },

  // Tam permission-əsaslı, fail-CLOSED: user/icazə yoxdursa false. Xüsusi super-admin halı yoxdur.
  hasPermission: (moduleCode, action = 'canGet') => {
    const { user } = get()
    if (!user) return false
    const codes = user.permissions
    if (!Array.isArray(codes) || codes.length === 0) return false
    const act = ACTION_MAP[action] || action // canX → ACTION; artıq ACTION-dursa olduğu kimi
    return codes.includes(`${moduleCode}:${act}`)
  },

  // Əlavə/qeyri-standart icazələr üçün — tam kodla yoxlama.
  hasAuthority: (code) => {
    const { user } = get()
    if (!user) return false
    const codes = user.permissions
    return Array.isArray(codes) && codes.includes(code)
  },
}))
