import api from './axios'

export const operatorsApi = {
  getAll: () => api.get('/operators'),
  getAllPaged: (params) => api.get('/operators/paged', { params }),
  getById: (id) => api.get(`/operators/${id}`),
  create: (data) => api.post('/operators', data),
  update: (id, data) => api.put(`/operators/${id}`, data),
  delete: (id) => api.delete(`/operators/${id}`),
  deleteAll: (ids) => api.delete('/operators/bulk', { data: { ids } }),

  uploadDocument: (id, type, file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/operators/${id}/documents/${type}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteDocument: (id, docId) => api.delete(`/operators/${id}/documents/${docId}`),
  getDownloadUrl: (id, docId) => `/api/operators/${id}/documents/${docId}/download`,

  previewDocument: async (id, docId, fileName) => {
    const res = await api.get(`/operators/${id}/documents/${docId}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const win = window.open(url, '_blank')
    if (win) win.document.title = fileName || 'Sənəd'
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  },

  downloadDocument: async (id, docId, fileName) => {
    const res = await api.get(`/operators/${id}/documents/${docId}/download`, { responseType: 'blob' })
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
