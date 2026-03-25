import api from './axios'

export const configApi = {
  getAll: () => api.get('/config'),
  getAllPaged: (params) => api.get('/config/paged', { params }),
  getCategories: () => api.get('/config/categories'),
  getByCategory: (category) => api.get(`/config/category/${category}`),
  getActiveByCategory: (category) => api.get(`/config/category/${category}/active`),
  getById: (id) => api.get(`/config/${id}`),
  create: (data) => api.post('/config', data),
  update: (id, data) => api.put(`/config/${id}`, data),
  delete: (id) => api.delete(`/config/${id}`),
  reorder: (category, orderedIds) => api.post(`/config/category/${category}/reorder`, orderedIds),
}
