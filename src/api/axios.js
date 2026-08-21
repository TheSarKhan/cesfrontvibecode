import axios from 'axios'
import toast from 'react-hot-toast'
import { isTokenExpired } from '../utils/jwt'

// Default relativ `/api` — prod-da nginx backend-ə proxy edir.
// Ayrı host/mobil üçün .env-dəki VITE_API_BASE_URL ilə override olunur.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Auth tələb etməyən endpointlər ──────────────────────────────────────────
const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/verify-otp',
  '/auth/reset-password',
  '/auth/refresh',
  '/system/report-error',
]

// ── Global error message extractor ─────────────────────────────────────────
export function extractErrorMessage(error, fallback = 'Gözlənilməz xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.') {
  if (!error) return fallback

  // 1. Backend ApiResponse error message
  if (error.response?.data?.message && typeof error.response.data.message === 'string') {
    return error.response.data.message
  }

  // 2. Validation errors
  if (error.response?.data?.errors) {
    const errs = error.response.data.errors
    if (Array.isArray(errs)) {
      return errs.map((e) => (typeof e === 'string' ? e : e.message || e.defaultMessage || JSON.stringify(e))).join('; ')
    }
    if (typeof errs === 'object') {
      return Object.values(errs).filter(Boolean).join('; ')
    }
  }

  // 3. HTTP status codes
  const status = error.response?.status
  if (status === 400) {
    return 'Daxil edilən məlumatlar natamam və ya yanlışdır. Zəhmət olmasa xanaları yoxlayın.'
  }
  if (status === 401) {
    return 'Giriş sessiyanızın müddəti bitib. Zəhmət olmasa yenidən daxil olun.'
  }
  if (status === 403) {
    return 'Bu əməliyyatı icra etmək üçün səlahiyyətiniz yoxdur.'
  }
  if (status === 404) {
    return 'Axtarılan məlumat və ya səhifə tapılmadı.'
  }
  if (status === 409) {
    return 'Məlumat ziddiyyəti: Bu qeyd artıq mövcuddur və ya digər məlumatlarla bağlıdır.'
  }
  if (status === 413) {
    return 'Yüklənən faylın həcmi çox böyükdür (Maksimum limit: 50MB).'
  }
  if (status === 415) {
    return 'Dəstəklənməyən fayl formatı.'
  }
  if (status === 422) {
    return 'Məlumat emal edilə bilmədi: Yanlış status və ya məntiqi qayda pozuntusu.'
  }
  if (status === 429) {
    return 'Həddindən artıq sorğu göndərilib. Zəhmət olmasa bir qədər sonra yenidən cəhd edin.'
  }
  if (status === 500) {
    return 'Serverdə daxili xəta baş verdi. Zəhmət olmasa daha sonra yenidən cəhd edin və ya administratora müraciət edin.'
  }
  if (status === 502 || status === 503 || status === 504) {
    return 'Server müvəqqəti olaraq əlçatan deyil və ya yenidən başladılır. Zəhmət olmasa az sonra yenidən yoxlayın.'
  }

  // 4. Network / Timeout
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'Sorğu vaxtı bitdi. İnternet bağlantınızı və ya serverin vəziyyətini yoxlayın.'
  }
  if (error.message === 'Network Error' || !error.response) {
    return 'Serverlə əlaqə yaradılmadı. İnternet bağlantınızı və ya serverin aktivliyini yoxlayın.'
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }

  return fallback
}

// ── Request interceptor: token yoxla, lazımsa refresh et ─────────────────────
axiosInstance.interceptors.request.use(
  async (config) => {
    const isPublic = PUBLIC_ENDPOINTS.some((ep) => config.url?.includes(ep))

    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')

    // Public endpoint-lərdə token yoxlanışı lazım deyil
    if (isPublic) {
      if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
      return config
    }

    // Hər ikisi yoxdursa — login-ə
    if (!accessToken && !refreshToken) {
      clearAuthAndRedirect()
      return Promise.reject(new Error('Token yoxdur'))
    }

    // Access token vaxtı bitibsə — refresh cəhdi
    if (accessToken && isTokenExpired(accessToken)) {
      if (!refreshToken || isTokenExpired(refreshToken)) {
        // Refresh da bitib — login-ə
        clearAuthAndRedirect()
        return Promise.reject(new Error('Session vaxtı bitdi'))
      }

      // Refresh token hələ keçərlidir — yeni access al
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
          const newAccessToken = data.data.accessToken
          const newRefreshToken = data.data.refreshToken
          localStorage.setItem('accessToken', newAccessToken)
          localStorage.setItem('refreshToken', newRefreshToken)
          axiosInstance.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`
          processQueue(null, newAccessToken)
          config.headers.Authorization = `Bearer ${newAccessToken}`
        } catch {
          processQueue(new Error('Refresh uğursuz'), null)
          clearAuthAndRedirect()
          return Promise.reject(new Error('Session vaxtı bitdi'))
        } finally {
          isRefreshing = false
        }
      } else {
        // Artıq refresh gedir — queue-ya əlavə et
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          config.headers.Authorization = `Bearer ${token}`
          return config
        })
      }
    } else if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor: handle 401 → refresh → retry ───────────────────────
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

axiosInstance.interceptors.response.use(
  (response) => {
    if (response.status === 202) {
      const msg = response.data?.message || 'Əməliyyat təsdiq gözləyir'
      toast.success(msg, { icon: '⏳', duration: 4000 })
      const err = Object.assign(new Error(msg), { isPending: true, response })
      return Promise.reject(err)
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status

    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return axiosInstance(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refreshToken')

      if (!refreshToken) {
        isRefreshing = false
        clearAuthAndRedirect()
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        })
        const newAccessToken = data.data.accessToken
        const newRefreshToken = data.data.refreshToken

        localStorage.setItem('accessToken', newAccessToken)
        localStorage.setItem('refreshToken', newRefreshToken)

        axiosInstance.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

        processQueue(null, newAccessToken)
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearAuthAndRedirect()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Global error toast — 401 və isPending xaric bütün xətalar üçün
    if (!error.isPending && !originalRequest?._suppressToast) {
      const msg = extractErrorMessage(error)
      const errorReport = {
        errorMessage: msg,
        pageUrl: typeof window !== 'undefined' ? window.location.pathname + window.location.search : '',
        requestUrl: originalRequest?.url || '',
        requestMethod: (originalRequest?.method || 'GET').toUpperCase(),
        httpStatus: status || 0,
        errorDetails: error.response?.data ? JSON.stringify(error.response.data) : (error.stack || error.message || ''),
        timestamp: new Date().toLocaleString('az-AZ'),
      }

      toast.error(msg, {
        duration: 7000,
        errorReport,
      })
      error._toasted = true
      error._errorMessage = msg
    }

    return Promise.reject(error)
  }
)

function clearAuthAndRedirect() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  window.location.href = '/login'
}

export default axiosInstance
