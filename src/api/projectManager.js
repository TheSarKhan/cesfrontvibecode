import api from './axios'

export const projectManagerApi = {
  getStats: () => api.get('/project-manager/stats'),
  getRequestsPaged: (params) => api.get('/project-manager/requests/paged', { params }),
  getRequest: (id) => api.get(`/project-manager/requests/${id}`),

  accept: (id) => api.post(`/project-manager/requests/${id}/accept`),
  reject: (id, reason) => api.post(`/project-manager/requests/${id}/reject`, { reason }),

  saveCustomerContact: (id, data) =>
    api.put(`/project-manager/requests/${id}/customer-contact`, data),

  saveRequiredDocuments: (id, documentItemIds) =>
    api.put(`/project-manager/requests/${id}/required-documents`, { documentItemIds }),

  saveShortlist: (id, data) => api.post(`/project-manager/requests/${id}/shortlist`, data),
  deleteShortlistItem: (id, itemId) =>
    api.delete(`/project-manager/requests/${id}/shortlist/items/${itemId}`),

  sendToCoordinator: (id) => api.post(`/project-manager/requests/${id}/send-to-coordinator`),

  saveCustomerAgreement: (id, data) =>
    api.put(`/project-manager/requests/${id}/customer-agreement`, data),

  // Çoxlu texnika — xətt üzrə razılaşma
  saveCustomerAgreementItem: (id, itemId, data) =>
    api.put(`/project-manager/requests/${id}/items/${itemId}/customer-agreement`, data),

  approve: (id) => api.post(`/project-manager/requests/${id}/approve`),

  // Geri qaytarma — koordinatora yeni təklif üçün (səbəb məcburi)
  sendBackToCoordinator: (id, reason) =>
    api.post(`/project-manager/requests/${id}/send-back-to-coordinator`, { reason }),

  // Sənəd yükləmə (PM_PRICE_NEGOTIATION mərhələsində)
  uploadContract: (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/project-manager/requests/${id}/upload-contract`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadPriceProtocol: (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/project-manager/requests/${id}/upload-price-protocol`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  // Çoxlu texnika — xətt üzrə sənəd yükləmə
  uploadContractItem: (id, itemId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/project-manager/requests/${id}/items/${itemId}/upload-contract`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadPriceProtocolItem: (id, itemId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/project-manager/requests/${id}/items/${itemId}/upload-price-protocol`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteDocument: (id, documentId) =>
    api.delete(`/project-manager/requests/${id}/documents/${documentId}`),
  getDocumentDownloadUrl: (id, documentId) =>
    `/api/project-manager/requests/${id}/documents/${documentId}/download`,
}
