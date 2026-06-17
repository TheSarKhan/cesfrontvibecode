import api from './axios'

export const documentCheckApi = {
  getPending: () => api.get('/accounting/document-checks'),
  get: (requestId) => api.get(`/accounting/document-checks/${requestId}`),

  uploadContract: (requestId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/accounting/document-checks/${requestId}/upload-contract`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadPriceProtocol: (requestId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/accounting/document-checks/${requestId}/upload-price-protocol`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  // Çoxlu texnika — xətt üzrə sənəd yükləmə
  uploadContractItem: (requestId, itemId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/accounting/document-checks/${requestId}/items/${itemId}/upload-contract`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadPriceProtocolItem: (requestId, itemId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/accounting/document-checks/${requestId}/items/${itemId}/upload-price-protocol`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteDocument: (requestId, documentId) =>
    api.delete(`/accounting/document-checks/${requestId}/documents/${documentId}`),
  getDownloadUrl: (requestId, documentId) =>
    `/api/accounting/document-checks/${requestId}/documents/${documentId}/download`,
  completeCheck: (requestId) =>
    api.post(`/accounting/document-checks/${requestId}/complete-check`),
  // Geri qaytarma — LM-ə (qiymət danışığına) iadə (səbəb məcburi)
  sendBack: (requestId, reason) =>
    api.post(`/accounting/document-checks/${requestId}/send-back`, { reason }),
}
