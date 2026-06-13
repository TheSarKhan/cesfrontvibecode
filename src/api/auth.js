import axiosInstance from './axios'
import axios from 'axios'

export const authApi = {
  // plain axios — 401 refresh loop-dan qorunmaq üçün interceptor-suz
  login: (credentials) =>
    axios.post('/api/auth/login', credentials),

  logout: (refreshToken) =>
    axiosInstance.post('/auth/logout', { refreshToken }),

  forgotPassword: (email) =>
    axiosInstance.post('/auth/forgot-password', { email }),

  verifyOtp: (email, otp) =>
    axiosInstance.post('/auth/verify-otp', { email, otp }),

  resetPassword: (verificationToken, newPassword) =>
    axiosInstance.post('/auth/reset-password', { verificationToken, newPassword }),

  // plain axios — refresh loop-dan qorunmaq üçün interceptor-suz
  refresh: (refreshToken) =>
    axios.post('/api/auth/refresh', { refreshToken }),
}
