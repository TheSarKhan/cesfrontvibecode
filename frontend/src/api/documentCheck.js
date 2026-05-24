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
  deleteDocument: (requestId, documentId) =>
    api.delete(`/accounting/document-checks/${requestId}/documents/${documentId}`),
  getDownloadUrl: (requestId, documentId) =>
    `/api/accounting/document-checks/${requestId}/documents/${documentId}/download`,
  completeCheck: (requestId) =>
    api.post(`/accounting/document-checks/${requestId}/complete-check`),
}
