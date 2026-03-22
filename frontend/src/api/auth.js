import axiosInstance from './axios'
import axios from 'axios'

export const authApi = {
  login: (credentials) => axios.post('/api/auth/login', credentials),

  logout: (refreshToken) =>
    axiosInstance.post('/auth/logout', { refreshToken }),

  refresh: (refreshToken) =>
    axios.post('/api/auth/refresh', { refreshToken }),
}
