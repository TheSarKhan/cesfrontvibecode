import api from './axios'

export const customersApi = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),

  uploadDocument: (id, file, documentName) => {
    const fd = new FormData()
    fd.append('file', file)
    if (documentName) fd.append('documentName', documentName)
    return api.post(`/customers/${id}/documents`, fd, { headers: { 'Content-Type': undefined } })
  },
  deleteDocument: (id, documentId) => api.delete(`/customers/${id}/documents/${documentId}`),
  getDocumentDownloadUrl: (id, documentId) => {
    const base = api.defaults.baseURL || ''
    return `${base}/customers/${id}/documents/${documentId}/download`
  },
}
