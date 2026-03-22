import api from './axios'

export const requestsApi = {
  getAll: (params) => api.get('/requests', { params }),
  getById: (id) => api.get(`/requests/${id}`),
  create: (data) => api.post('/requests', data),
  update: (id, data) => api.put(`/requests/${id}`, data),
  submit: (id) => api.post(`/requests/${id}/submit`),
  sendToCoordinator: (id) => api.post(`/requests/${id}/send-to-coordinator`),
  delete: (id) => api.delete(`/requests/${id}`),
}
