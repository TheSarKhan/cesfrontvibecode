import axiosInstance from './axios'

export const usersApi = {
  getAll: () => axiosInstance.get('/users'),
  getAllPaged: (params) => axiosInstance.get('/users/paged', { params }),
  getById: (id) => axiosInstance.get(`/users/${id}`),
  create: (data) => axiosInstance.post('/users', data),
  update: (id, data) => axiosInstance.put(`/users/${id}`, data),
  updateApproval: (id, data) => axiosInstance.put(`/users/${id}/approval`, data),
  toggleActive: (id) => axiosInstance.patch(`/users/${id}/toggle-active`),
  delete: (id) => axiosInstance.delete(`/users/${id}`),

  // Self-service profile
  me: () => axiosInstance.get('/users/me'),
  uploadProfileImage: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return axiosInstance.post('/users/me/profile-image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  updateContact: (data) => axiosInstance.put('/users/me/contact', data),
  updatePassword: (data) => axiosInstance.put('/users/me/password', data),
}
