import api from './axios'

export const projectManagerApi = {
  getRequests: () => api.get('/project-manager/requests'),
  getRequestsPaged: (params) => api.get('/project-manager/requests/paged', { params }),
  getRequest: (id) => api.get(`/project-manager/requests/${id}`),

  accept: (id) => api.post(`/project-manager/requests/${id}/accept`),
  saveShortlist: (id, data) => api.post(`/project-manager/requests/${id}/shortlist`, data),
  deleteShortlistItem: (id, itemId) =>
    api.delete(`/project-manager/requests/${id}/shortlist/items/${itemId}`),
  sendToCoordinator: (id) => api.post(`/project-manager/requests/${id}/send-to-coordinator`),
  saveCustomerAgreement: (id, data) =>
    api.put(`/project-manager/requests/${id}/customer-agreement`, data),
  approve: (id) => api.post(`/project-manager/requests/${id}/approve`),
  reject: (id, reason) => api.post(`/project-manager/requests/${id}/reject`, { reason }),
}
