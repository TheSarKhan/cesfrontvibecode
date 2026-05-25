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

  // Mərhələ B — İcra
  assignOperator: (requestId, operatorId) =>
    api.post(`/coordinator/requests/${requestId}/assign-operator`, null, { params: { operatorId } }),
  verifyEquipmentDocs: (requestId) =>
    api.post(`/coordinator/requests/${requestId}/verify-equipment-docs`),
  dispatch: (requestId) =>
    api.post(`/coordinator/requests/${requestId}/dispatch`),
  deliver: (requestId, notes) =>
    api.post(`/coordinator/requests/${requestId}/deliver`, { notes }),
}
