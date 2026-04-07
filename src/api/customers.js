import api from './axios'

export const customersApi = {
  getAll: (params) => api.get('/customers', { params }),
  getAllPaged: (params) => api.get('/customers/paged', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),

  uploadDocument: (id, file, documentName, documentDate) => {
    const fd = new FormData()
    fd.append('file', file)
    if (documentName) fd.append('documentName', documentName)
    if (documentDate) fd.append('documentDate', documentDate)
    return api.post(`/customers/${id}/documents`, fd, { headers: { 'Content-Type': undefined } })
  },
  deleteDocument: (id, documentId) => api.delete(`/customers/${id}/documents/${documentId}`),
  downloadDocument: async (id, documentId, fileName) => {
    const res = await api.get(`/customers/${id}/documents/${documentId}/download`, { responseType: 'blob' })
    const cd = res.headers['content-disposition'] || ''
    const match = cd.match(/filename="?([^";\s]+)"?/)
    const serverExt = match ? match[1].substring(match[1].lastIndexOf('.')) : ''
    const name = serverExt && !fileName?.toLowerCase().endsWith(serverExt.toLowerCase())
      ? (fileName || 'sened') + serverExt : (fileName || 'sened')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(res.data)
    link.download = name
    link.click()
    URL.revokeObjectURL(link.href)
  },
}
