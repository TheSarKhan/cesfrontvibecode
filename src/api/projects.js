import api from './axios'

export const projectsApi = {
  getAll: (params) => api.get('/projects', { params }),
  getAllPaged: (params) => api.get('/projects/paged', { params }),
  getById: (id) => api.get(`/projects/${id}`),

  uploadContract: (id, formData, startDate) => {
    const url = startDate
      ? `/projects/${id}/contract?startDate=${startDate}`
      : `/projects/${id}/contract`
    return api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },

  getFinances: (id) => api.get(`/projects/${id}/finances`),
  addExpense: (id, data) => api.post(`/projects/${id}/expenses`, data),
  deleteExpense: (id, expenseId) => api.delete(`/projects/${id}/expenses/${expenseId}`),
  addRevenue: (id, data) => api.post(`/projects/${id}/revenues`, data),
  deleteRevenue: (id, revenueId) => api.delete(`/projects/${id}/revenues/${revenueId}`),

  complete: (id, data) => api.post(`/projects/${id}/complete`, data),
  updateEndDate:   (id, data) => api.patch(`/projects/${id}/end-date`, data),
  updateStartDate: (id, data) => api.patch(`/projects/${id}/start-date`, data),
}
