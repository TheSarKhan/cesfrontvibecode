import api from './axios'

export const operatorsApi = {
  getAll: () => api.get('/operators'),
  getById: (id) => api.get(`/operators/${id}`),
  create: (data) => api.post('/operators', data),
  update: (id, data) => api.put(`/operators/${id}`, data),
  delete: (id) => api.delete(`/operators/${id}`),

  uploadDocument: (id, type, file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/operators/${id}/documents/${type}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteDocument: (id, docId) => api.delete(`/operators/${id}/documents/${docId}`),
  getDownloadUrl: (id, docId) => `/api/operators/${id}/documents/${docId}/download`,
}
