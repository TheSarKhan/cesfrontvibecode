import api from './axios'

export const garageApi = {
  // Equipment CRUD
  getAll: (params) => api.get('/garage/equipment', { params }),
  getById: (id) => api.get(`/garage/equipment/${id}`),
  create: (data) => api.post('/garage/equipment', data),
  update: (id, data) => api.put(`/garage/equipment/${id}`, data),
  delete: (id) => api.delete(`/garage/equipment/${id}`),

  // Inspections (no GET endpoint — inspections come embedded in getById)
  addInspection: (id, data) =>
    api.post(`/garage/equipment/${id}/inspections`, data),
  uploadInspectionDocument: (id, inspectionId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/garage/equipment/${id}/inspections/${inspectionId}/document`, fd, {
      headers: { 'Content-Type': undefined },
    })
  },

  // Documents (no GET endpoint — documents come embedded in getById)
  addDocument: (id, file, documentName) => {
    const fd = new FormData()
    fd.append('file', file)
    const url = documentName
      ? `/garage/equipment/${id}/documents?documentName=${encodeURIComponent(documentName)}`
      : `/garage/equipment/${id}/documents`
    return api.post(url, fd, { headers: { 'Content-Type': undefined } })
  },

  // Download helpers (axios blob → browser download)
  downloadDocument: (id, docId, fileName) =>
    api.get(`/garage/equipment/${id}/documents/${docId}/download`, { responseType: 'blob' })
      .then((res) => triggerDownload(res.data, fileName)),

  downloadInspectionDoc: (id, inspectionId, fileName) =>
    api.get(`/garage/equipment/${id}/inspections/${inspectionId}/download`, { responseType: 'blob' })
      .then((res) => triggerDownload(res.data, fileName)),

  // Images (embedded in getById response as `images` array)
  addImage: (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/garage/equipment/${id}/images`, fd, { headers: { 'Content-Type': undefined } })
  },
  deleteImage: (id, imageId) => api.delete(`/garage/equipment/${id}/images/${imageId}`),
  getImageViewUrl: (id, imageId) => {
    const base = api.defaults.baseURL || ''
    return `${base}/garage/equipment/${id}/images/${imageId}/view`
  },

  // Project history
  getProjectHistory: (id) => api.get(`/garage/equipment/${id}/project-history`),
}

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || 'fayl'
  a.click()
  URL.revokeObjectURL(url)
}
