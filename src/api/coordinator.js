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
  dispatch: (requestId) =>
    api.post(`/coordinator/requests/${requestId}/dispatch`),
  deliver: (requestId, notes) =>
    api.post(`/coordinator/requests/${requestId}/deliver`, { notes }),
}
