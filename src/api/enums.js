import api from './axios'

export const enumsApi = {
  // Bütün enum-ların kod→etiket xəritəsi (tək doğru mənbə)
  getAll: () => api.get('/enums'),
}
