import api from './axios'

export const accountingApi = {
  getAll: (params) => api.get('/accounting/invoices', { params }),
  getSummary: () => api.get('/accounting/invoices/summary'),
  getById: (id) => api.get(`/accounting/invoices/${id}`),
  create: (data) => api.post('/accounting/invoices', data),
  update: (id, data) => api.put(`/accounting/invoices/${id}`, data),
  delete: (id) => api.delete(`/accounting/invoices/${id}`),
}
