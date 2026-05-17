import api from './axios'

export const banksApi = {
  getAll:  ()        => api.get('/banks'),
  create:  (data)    => api.post('/banks', data),
  update:  (id, data)=> api.put(`/banks/${id}`, data),
  delete:  (id)      => api.delete(`/banks/${id}`),
}
