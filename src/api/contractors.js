import api from './axios'
import { makePartyDocsApi } from './partyDocs'

export const contractorsApi = {
  getAll: (params) => api.get('/contractors', { params }),
  getAllPaged: (params) => api.get('/contractors/paged', { params }),
  getById: (id) => api.get(`/contractors/${id}`),
  create: (data) => api.post('/contractors', data),
  update: (id, data) => api.put(`/contractors/${id}`, data),
  delete: (id) => api.delete(`/contractors/${id}`),
  getProjectHistory: (id) => api.get(`/contractors/${id}/projects`),
  getInvoices: (id) => api.get(`/contractors/${id}/invoices`),
  getPayables: (id) => api.get(`/contractors/${id}/payables`),
  // Sənəd mərkəzi
  docs: makePartyDocsApi('/contractors'),
}
