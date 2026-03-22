import axiosInstance from './axios'

export const rolesApi = {
  getByDepartment: (deptId) => axiosInstance.get(`/roles/department/${deptId}`),
  create: (data) => axiosInstance.post('/roles', data),
  update: (id, data) => axiosInstance.put(`/roles/${id}`, data),
  delete: (id) => axiosInstance.delete(`/roles/${id}`),
}
