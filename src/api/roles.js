import axiosInstance from './axios'

export const rolesApi = {
  getAllPaged: (params) => axiosInstance.get('/roles/paged', { params }),
  getByDepartment: (deptId) => axiosInstance.get(`/roles/department/${deptId}`),
  create: (data) => axiosInstance.post('/roles', data),
  update: (id, data) => axiosInstance.put(`/roles/${id}`, data),
  delete: (id) => axiosInstance.delete(`/roles/${id}`),
}
