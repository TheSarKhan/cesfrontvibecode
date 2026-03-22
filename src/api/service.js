import api from './axios'

export const serviceApi = {
  getAll:    (params) => api.get('/service/records', { params }),
  getById:   (id)     => api.get(`/service/records/${id}`),
  create:    (data)   => api.post('/service/records', data),
  update:    (id, data) => api.put(`/service/records/${id}`, data),
  delete:    (id)     => api.delete(`/service/records/${id}`),
}
