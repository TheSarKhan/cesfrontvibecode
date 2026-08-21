import api from './axios'

export const approvalApi = {
  getQueue: () => api.get('/approval', { _suppressToast: true }),
  getDetail: (id) => api.get(`/approval/${id}`),
  approve: (id) => api.post(`/approval/${id}/approve`),
  reject: (id, reason) => api.post(`/approval/${id}/reject`, { reason }),
}
