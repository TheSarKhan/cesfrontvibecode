import axiosInstance from './axios'

export const departmentsApi = {
  getAll: () => axiosInstance.get('/departments'),
  create: (data) => axiosInstance.post('/departments', data),
  update: (id, data) => axiosInstance.put(`/departments/${id}`, data),
  delete: (id) => axiosInstance.delete(`/departments/${id}`),
}
