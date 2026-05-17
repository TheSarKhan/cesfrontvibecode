import api from './axios'

export const expenseCategoryApi = {
  getAll:       ()     => api.get('/expense-categories'),
  getAllActive:  ()     => api.get('/expense-categories/active'),
  getById:      (id)   => api.get(`/expense-categories/${id}`),
  create:       (data) => api.post('/expense-categories', data),
  update:       (id, data) => api.put(`/expense-categories/${id}`, data),
  delete:       (id)   => api.delete(`/expense-categories/${id}`),
}

export const expenseSourceApi = {
  getAll:               ()           => api.get('/expense-sources'),
  getAllActive:          ()           => api.get('/expense-sources/active'),
  getByCategory:        (categoryId) => api.get(`/expense-sources/by-category/${categoryId}`),
  getActiveByCategoryId:(categoryId) => api.get(`/expense-sources/by-category/${categoryId}/active`),
  getById:              (id)         => api.get(`/expense-sources/${id}`),
  create:               (data)       => api.post('/expense-sources', data),
  update:               (id, data)   => api.put(`/expense-sources/${id}`, data),
  delete:               (id)         => api.delete(`/expense-sources/${id}`),
}
