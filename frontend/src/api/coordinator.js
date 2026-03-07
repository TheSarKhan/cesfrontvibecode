import api from './axios'

export const coordinatorApi = {
  getRequests: () => api.get('/coordinator/requests'),
  getPlan: (requestId) => api.get(`/coordinator/requests/${requestId}/plan`),
  savePlan: (requestId, data) => api.post(`/coordinator/requests/${requestId}/plan`, data),
  submitPlan: (requestId) => api.post(`/coordinator/requests/${requestId}/submit`),
  selectEquipment: (requestId, equipmentId) =>
    api.put(`/coordinator/requests/${requestId}/equipment`, null, { params: { equipmentId } }),
  uploadDocument: (requestId, formData) =>
    api.post(`/coordinator/requests/${requestId}/plan/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteDocument: (requestId, documentId) =>
    api.delete(`/coordinator/requests/${requestId}/plan/documents/${documentId}`),
  getDocumentDownloadUrl: (requestId, documentId) =>
    `/api/coordinator/requests/${requestId}/plan/documents/${documentId}/download`,

  acceptOffer: (requestId) => api.post(`/coordinator/requests/${requestId}/accept`),
  rejectOffer: (requestId) => api.post(`/coordinator/requests/${requestId}/reject`),
}
