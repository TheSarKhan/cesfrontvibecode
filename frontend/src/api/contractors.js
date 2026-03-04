import api from './axios'

export const contractorsApi = {
  getAll: (params) => api.get('/contractors', { params }),
  getById: (id) => api.get(`/contractors/${id}`),
  create: (data) => api.post('/contractors', data),
  update: (id, data) => api.put(`/contractors/${id}`, data),
  delete: (id) => api.delete(`/contractors/${id}`),
}
