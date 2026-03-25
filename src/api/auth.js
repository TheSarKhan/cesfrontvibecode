import axiosInstance from './axios'
import axios from 'axios'

export const authApi = {
  login: (credentials) => axios.post('/api/auth/login', credentials),

  logout: (refreshToken) =>
    axiosInstance.post('/auth/logout', { refreshToken }),

  refresh: (refreshToken) =>
    axios.post('/api/auth/refresh', { refreshToken }),

  forgotPassword: (email) =>
    axios.post('/api/auth/forgot-password', { email }),

  resetPassword: (token, newPassword) =>
    axios.post('/api/auth/reset-password', { token, newPassword }),
}
