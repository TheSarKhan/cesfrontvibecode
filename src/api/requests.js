import api from './axios'

export const requestsApi = {
  getAll: (params) => api.get('/requests', { params }),
  getAllPaged: (params) => api.get('/requests/paged', { params }),
  getById: (id) => api.get(`/requests/${id}`),
  create: (data) => api.post('/requests', data),
  update: (id, data) => api.put(`/requests/${id}`, data),
  submit: (id) => api.post(`/requests/${id}/submit`),
  sendToCoordinator: (id) => api.post(`/requests/${id}/send-to-coordinator`),
  changeStatus: (id, data) => api.post(`/requests/${id}/change-status`, data),
  getStatusTransitions: () => api.get('/requests/status-transitions'),
  getStatusHistory: (id) => api.get(`/requests/${id}/status-history`),
  bulkUpdateNotes: (ids, notes) => api.post('/requests/bulk-update-notes', { ids, notes }),
  bulkUpdateRegion: (ids, region) => api.post('/requests/bulk-update-region', { ids, region }),
  delete: (id) => api.delete(`/requests/${id}`),
}
