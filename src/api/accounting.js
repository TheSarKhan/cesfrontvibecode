import api from './axios'

export const accountingApi = {
  // ── Invoices (E-Qaimələr) ──
  getAll: (params) => api.get('/accounting/invoices', { params }),
  getAllPaged: (params) => api.get('/accounting/invoices/paged', { params }),
  getSummary: () => api.get('/accounting/invoices/summary'),
  getById: (id) => api.get(`/accounting/invoices/${id}`),
  create: (data) => api.post('/accounting/invoices', data),
  update: (id, data) => api.put(`/accounting/invoices/${id}`, data),
  delete: (id) => api.delete(`/accounting/invoices/${id}`),
  getByProject: (projectId) => api.get(`/accounting/invoices/by-project/${projectId}`),
  patchFields: (id, data) => api.patch(`/accounting/invoices/${id}/fields`, data),
  sendToAccounting: (id) => api.patch(`/accounting/invoices/${id}/fields`, { status: 'SENT' }),

  // ── Transactions (Əməliyyatlar) ──
  getTransactions: (params) => api.get('/accounting/transactions', { params }),
  getTransactionById: (id) => api.get(`/accounting/transactions/${id}`),
  createTransaction: (data) => api.post('/accounting/transactions', data),
  updateTransaction: (id, data) => api.put(`/accounting/transactions/${id}`, data),
  deleteTransaction: (id) => api.delete(`/accounting/transactions/${id}`),

  // ── Payments (Ödənişlər) ──
  getPayments: (params) => api.get('/accounting/payments', { params }),
  getPaymentById: (id) => api.get(`/accounting/payments/${id}`),
  createPayment: (data) => api.post('/accounting/payments', data),
  updatePayment: (id, data) => api.put(`/accounting/payments/${id}`, data),
  deletePayment: (id) => api.delete(`/accounting/payments/${id}`),

  // ── Budget (Büdcə) ──
  getBudgets: (params) => api.get('/accounting/budgets', { params }),
  getBudgetById: (id) => api.get(`/accounting/budgets/${id}`),
  createBudget: (data) => api.post('/accounting/budgets', data),
  updateBudget: (id, data) => api.put(`/accounting/budgets/${id}`, data),
  deleteBudget: (id) => api.delete(`/accounting/budgets/${id}`),

  // ── Reports & Analytics ──
  getCashFlow: (params) => api.get('/accounting/reports/cash-flow', { params }),
  getProfitLoss: (params) => api.get('/accounting/reports/profit-loss', { params }),
  getExpenseBreakdown: (params) => api.get('/accounting/reports/expense-breakdown', { params }),
  getMonthlyTrend: (params) => api.get('/accounting/reports/monthly-trend', { params }),
}
