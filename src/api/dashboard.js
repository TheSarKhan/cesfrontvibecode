import api from './axios'

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats', { _suppressToast: true }),
}
