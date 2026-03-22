import api from './axios'

export const auditApi = {
  getAll: (params) => api.get('/audit', { params }),
  getRecent: () => api.get('/audit/recent'),
  getForEntity: (entityType, entityId) => api.get(`/audit/${entityType}/${entityId}`),
}
