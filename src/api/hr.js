import api from './axios'

export const hrApi = {
  // ── Dashboard ──
  getDashboard: () => api.get('/hr/dashboard'),

  // ── Positions ──
  getPositions: () => api.get('/hr/positions'),
  getPosition: (id) => api.get(`/hr/positions/${id}`),
  createPosition: (data) => api.post('/hr/positions', data),
  updatePosition: (id, data) => api.put(`/hr/positions/${id}`, data),
  deletePosition: (id) => api.delete(`/hr/positions/${id}`),

  // ── Employees ──
  getEmployees: () => api.get('/hr/employees'),
  getEmployeesPaged: (params) => api.get('/hr/employees/paged', { params }),
  getEmployee: (id) => api.get(`/hr/employees/${id}`),
  createEmployee: (data) => api.post('/hr/employees', data),
  updateEmployee: (id, data) => api.put(`/hr/employees/${id}`, data),
  terminateEmployee: (id, data) => api.patch(`/hr/employees/${id}/terminate`, data),
  deleteEmployee: (id) => api.delete(`/hr/employees/${id}`),

  // ── Tax rates ──
  getTaxRates: () => api.get('/hr/tax-rates'),
  getActiveTaxRate: () => api.get('/hr/tax-rates/active'),
  getTaxRate: (id) => api.get(`/hr/tax-rates/${id}`),
  createTaxRate: (data) => api.post('/hr/tax-rates', data),
  updateTaxRate: (id, data) => api.put(`/hr/tax-rates/${id}`, data),
  activateTaxRate: (id) => api.patch(`/hr/tax-rates/${id}/activate`),
  deleteTaxRate: (id) => api.delete(`/hr/tax-rates/${id}`),

  // ── Deduction config (generic tutulma konfiqurasiyası) ──
  getDeductionTypes: () => api.get('/hr/deduction-config/types'),
  createDeductionType: (data) => api.post('/hr/deduction-config/types', data),
  updateDeductionType: (id, data) => api.put(`/hr/deduction-config/types/${id}`, data),
  deleteDeductionType: (id) => api.delete(`/hr/deduction-config/types/${id}`),
  getDeductionVersions: () => api.get('/hr/deduction-config/versions'),
  getDeductionVersion: (id) => api.get(`/hr/deduction-config/versions/${id}`),
  getActiveDeductionConfig: () => api.get('/hr/deduction-config/active'),
  createDeductionVersion: (data) => api.post('/hr/deduction-config/versions', data),
  activateDeductionVersion: (id) => api.patch(`/hr/deduction-config/versions/${id}/activate`),
  deleteDeductionVersion: (id) => api.delete(`/hr/deduction-config/versions/${id}`),
  previewDeductions: (data) => api.post('/hr/deduction-config/preview', data),

  // ── Payroll periods ──
  getPeriods: () => api.get('/hr/payroll/periods'),
  getPeriodsPaged: (params) => api.get('/hr/payroll/periods/paged', { params }),
  getPeriod: (id) => api.get(`/hr/payroll/periods/${id}`),
  createPeriod: (data, autoPopulate = true) =>
    api.post('/hr/payroll/periods', data, { params: { autoPopulate } }),
  updatePeriod: (id, data) => api.put(`/hr/payroll/periods/${id}`, data),
  populatePeriod: (id) => api.post(`/hr/payroll/periods/${id}/populate`),
  approvePeriod: (id) => api.patch(`/hr/payroll/periods/${id}/approve`),
  markPeriodPaid: (id) => api.patch(`/hr/payroll/periods/${id}/mark-paid`),
  reopenPeriod: (id) => api.patch(`/hr/payroll/periods/${id}/reopen`),
  deletePeriod: (id) => api.delete(`/hr/payroll/periods/${id}`),
  downloadPeriodPdf: (id) =>
    api.get(`/hr/payroll/periods/${id}/pdf`, { responseType: 'blob' }),

  // ── Payroll entries ──
  addEntry: (periodId, employeeId) =>
    api.post(`/hr/payroll/periods/${periodId}/entries/${employeeId}`),
  getEntry: (id) => api.get(`/hr/payroll/entries/${id}`),
  updateEntry: (id, data) => api.put(`/hr/payroll/entries/${id}`, data),
  deleteEntry: (id) => api.delete(`/hr/payroll/entries/${id}`),
  getEntriesByEmployee: (employeeId) =>
    api.get(`/hr/payroll/employees/${employeeId}/entries`),
  downloadPayslip: (id) =>
    api.get(`/hr/payroll/entries/${id}/payslip`, { responseType: 'blob' }),

  // ── Attendance ──
  getAttendanceByEmployee: (employeeId, params) =>
    api.get(`/hr/attendance/employees/${employeeId}`, { params }),
  getAttendance: (params) => api.get('/hr/attendance', { params }),
  upsertAttendance: (data) => api.post('/hr/attendance', data),
  deleteAttendance: (id) => api.delete(`/hr/attendance/${id}`),

  // ── Leaves ──
  getLeavesPaged: (params) => api.get('/hr/leaves/paged', { params }),
  getLeavesByEmployee: (employeeId) => api.get(`/hr/leaves/employees/${employeeId}`),
  getLeave: (id) => api.get(`/hr/leaves/${id}`),
  createLeave: (data) => api.post('/hr/leaves', data),
  approveLeave: (id, data) => api.patch(`/hr/leaves/${id}/approve`, data),
  rejectLeave: (id, data) => api.patch(`/hr/leaves/${id}/reject`, data),
  cancelLeave: (id) => api.patch(`/hr/leaves/${id}/cancel`),
  deleteLeave: (id) => api.delete(`/hr/leaves/${id}`),
}
