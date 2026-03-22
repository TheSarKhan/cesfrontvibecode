import api from './axios'

export const trashApi = {
  getAll: (module) => api.get('/trash', { params: module ? { module } : {} }),
  restore: (entityType, id) => api.post(`/trash/${entityType}/${id}/restore`),
}
