import api from './axios'

export const coordinatorApi = {
  // Liste + filtreleme
  getStats: () => api.get('/coordinator/stats'),
  getRequests: () => api.get('/coordinator/requests'),
  getRequestsPaged: (params) => api.get('/coordinator/requests/paged', { params }),
  getPlan: (requestId) => api.get(`/coordinator/requests/${requestId}/plan`),

  // Mərhələ A — Danışıq
  savePlan: (requestId, data) => api.post(`/coordinator/requests/${requestId}/plan`, data),
  submitPlan: (requestId) => api.post(`/coordinator/requests/${requestId}/submit`),
  rejectRequest: (requestId) => api.post(`/coordinator/requests/${requestId}/reject`),
  // Geri qaytarma — təklifi geri al, yenidən danışıq (səbəb məcburi)
  withdrawOffer: (requestId, reason) =>
    api.post(`/coordinator/requests/${requestId}/withdraw-offer`, { reason }),

  // Mərhələ B — İcra
  assignOperator: (requestId, operatorId) =>
    api.post(`/coordinator/requests/${requestId}/assign-operator`, null, { params: { operatorId } }),
  // Geri qaytarma — operatoru dəyişmək üçün (səbəb məcburi)
  resetOperator: (requestId, reason) =>
    api.post(`/coordinator/requests/${requestId}/reset-operator`, { reason }),
  verifyEquipmentDocs: (requestId) =>
    api.post(`/coordinator/requests/${requestId}/verify-equipment-docs`),
  toggleDocCheck: (requestId, configItemId, checked) =>
    api.put(`/coordinator/requests/${requestId}/doc-check`, { configItemId, checked }),
  dispatch: (requestId) =>
    api.post(`/coordinator/requests/${requestId}/dispatch`),
  deliver: (requestId, notes) =>
    api.post(`/coordinator/requests/${requestId}/deliver`, { notes }),

  // ─── İcra: hər texnika xətti ayrı (çoxlu model) ───────────────────────────
  assignOperatorItem: (requestId, itemId, operatorId) =>
    api.post(`/coordinator/requests/${requestId}/items/${itemId}/assign-operator`, null, { params: { operatorId } }),
  resetOperatorItem: (requestId, itemId, reason) =>
    api.post(`/coordinator/requests/${requestId}/items/${itemId}/reset-operator`, { reason }),
  toggleDocCheckItem: (requestId, itemId, configItemId, checked) =>
    api.put(`/coordinator/requests/${requestId}/items/${itemId}/doc-check`, { configItemId, checked }),
  verifyDocsItem: (requestId, itemId) =>
    api.post(`/coordinator/requests/${requestId}/items/${itemId}/verify-equipment-docs`),
  dispatchItem: (requestId, itemId) =>
    api.post(`/coordinator/requests/${requestId}/items/${itemId}/dispatch`),
  deliverItem: (requestId, itemId, notes) =>
    api.post(`/coordinator/requests/${requestId}/items/${itemId}/deliver`, { notes }),
  uploadItemDocument: (requestId, itemId, file, documentType = 'HANDOVER_ACT') => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('documentType', documentType)
    return api.post(`/coordinator/requests/${requestId}/items/${itemId}/documents`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // Plan sənədləri (təhvil-təslim aktı və s.)
  uploadDocument: (requestId, file, documentType = 'OTHER', documentName) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('documentType', documentType)
    if (documentName) fd.append('documentName', documentName)
    return api.post(`/coordinator/requests/${requestId}/plan/documents`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteDocument: (requestId, documentId) =>
    api.delete(`/coordinator/requests/${requestId}/plan/documents/${documentId}`),
  downloadDocument: (requestId, documentId) =>
    api.get(`/coordinator/requests/${requestId}/plan/documents/${documentId}/download`, { responseType: 'blob' }),
  // Texnikanın qarajdakı sənədi (koordinator yoxlaması üçün)
  downloadEquipmentDocument: (requestId, documentId) =>
    api.get(`/coordinator/requests/${requestId}/equipment-documents/${documentId}/download`, { responseType: 'blob' }),
  // Müqavilə sənədi (müştəri/sahib — koordinator oxu-rejimi)
  downloadRequestDocument: (requestId, documentId) =>
    api.get(`/coordinator/requests/${requestId}/request-documents/${documentId}/download`, { responseType: 'blob' }),
}
