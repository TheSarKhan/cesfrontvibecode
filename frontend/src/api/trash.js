import api from './axios'

export const trashApi = {
  getAll: (module) => api.get('/trash', { params: module ? { module } : {} }),
  getAllPaged: (params) => api.get('/trash/paged', { params }),
  restore: (entityType, id) => api.post(`/trash/${entityType}/${id}/restore`),
}
