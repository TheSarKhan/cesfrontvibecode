import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { isTokenExpired } from '../../utils/jwt'

export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')

    // Hər ikisi bitibsə — logout et
    if (accessToken && isTokenExpired(accessToken) && refreshToken && isTokenExpired(refreshToken)) {
      logout()
    }
  }, [logout])

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}
