import api from './axios'

export const permissionsApi = {
  // Dinamik icazə kataloqu (modul üzrə sıralanmış)
  getAll: () => api.get('/permissions'),
  // İcazə etiketini redaktə et
  update: (id, data) => api.put(`/permissions/${id}`, data),
}
