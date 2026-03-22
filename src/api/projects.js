import api from './axios'

export const projectsApi = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),

  uploadContract: (id, formData) =>
    api.post(`/projects/${id}/contract`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getFinances: (id) => api.get(`/projects/${id}/finances`),
  addExpense: (id, data) => api.post(`/projects/${id}/expenses`, data),
  deleteExpense: (id, expenseId) => api.delete(`/projects/${id}/expenses/${expenseId}`),
  addRevenue: (id, data) => api.post(`/projects/${id}/revenues`, data),
  deleteRevenue: (id, revenueId) => api.delete(`/projects/${id}/revenues/${revenueId}`),

  complete: (id, data) => api.post(`/projects/${id}/complete`, data),
  updateEndDate: (id, data) => api.patch(`/projects/${id}/end-date`, data),
}
