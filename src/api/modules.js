import axiosInstance from './axios'

export const modulesApi = {
  getAll: () => axiosInstance.get('/modules'),
}
