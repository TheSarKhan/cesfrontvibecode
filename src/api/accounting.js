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
  approve: (id) => api.patch(`/accounting/invoices/${id}/approve`),
  returnToProject: (id) => api.patch(`/accounting/invoices/${id}/return`),
  resubmit: (id, data) => api.post(`/accounting/invoices/${id}/resubmit`, data),
  returnToDraft: (id) => api.patch(`/accounting/invoices/${id}/draft`),

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
  getReportSummary: (params) => api.get('/accounting/reports/summary', { params }),
  getMonthlyTrend: (params) => api.get('/accounting/reports/monthly-trend', { params }),
  getProjectReport: (params) => api.get('/accounting/reports/by-project', { params }),
  getPartnerReport: (params) => api.get('/accounting/reports/by-partner', { params }),
  getExpenseBreakdown: (params) => api.get('/accounting/reports/expense-breakdown', { params }),
  getCashFlowReport: (params) => api.get('/accounting/reports/cash-flow', { params }),
  getComparison: (params) => api.get('/accounting/reports/comparison', { params }),
  getReceivableReport: (params) => api.get('/accounting/reports/receivables', { params }),

  // ── Receivables (Debitorlar) ──
  getReceivables: (params) => api.get('/accounting/receivables', { params }),
  getReceivable: (id) => api.get(`/accounting/receivables/${id}`),
  addReceivablePayment: (id, data) => api.post(`/accounting/receivables/${id}/payments`, data),
  deleteReceivablePayment: (id, paymentId) => api.delete(`/accounting/receivables/${id}/payments/${paymentId}`),
  completeReceivable: (id) => api.post(`/accounting/receivables/${id}/complete`),

  // ── Payables (Kreditorlar) ──
  getPayables: (params) => api.get('/accounting/payables', { params }),
  getPayable: (id) => api.get(`/accounting/payables/${id}`),
  addPayablePayment: (id, data) => api.post(`/accounting/payables/${id}/payments`, data),
  deletePayablePayment: (id, paymentId) => api.delete(`/accounting/payables/${id}/payments/${paymentId}`),
  completePayable: (id) => api.post(`/accounting/payables/${id}/complete`),

  // ── Sənədlər (Generated Documents) ──
  getDocumentsPaged: (params) => api.get('/accounting/documents/paged', { params }),
  getDocument: (id) => api.get(`/accounting/documents/${id}`),
  createDocument: (data) => api.post('/accounting/documents', data),
  deleteDocument: (id) => api.delete(`/accounting/documents/${id}`),
  previewDocumentLines: (data) => api.post('/accounting/documents/preview-lines', data),
  downloadDocumentPdf: (id) => api.get(`/accounting/documents/${id}/download`, { responseType: 'blob' }),
  regenerateDocumentPdf: (id) => api.post(`/accounting/documents/${id}/regenerate`),
}

