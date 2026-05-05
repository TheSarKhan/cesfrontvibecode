import api from './axios'

export const investorsApi = {
  getAll: (params) => api.get('/investors', { params }),
  getAllPaged: (params) => api.get('/investors/paged', { params }),
  getById: (id) => api.get(`/investors/${id}`),
  create: (data) => api.post('/investors', data),
  update: (id, data) => api.put(`/investors/${id}`, data),
  delete: (id) => api.delete(`/investors/${id}`),
  deleteAll: (ids) => api.delete('/investors/bulk', { data: { ids } }),
  getProjectHistory: (id) => api.get(`/investors/${id}/projects`),
  getInvoices: (id) => api.get(`/investors/${id}/invoices`),
  getPayables: (id) => api.get(`/investors/${id}/payables`),
}
