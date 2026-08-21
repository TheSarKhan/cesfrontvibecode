import axiosInstance from './axios'

export const systemApi = {
  reportError: async (reportData) => {
    try {
      const payload = {
        errorMessage: reportData.errorMessage || 'Naməlum xəta',
        pageUrl: reportData.pageUrl || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : ''),
        requestUrl: reportData.requestUrl || '',
        requestMethod: reportData.requestMethod || '',
        httpStatus: reportData.httpStatus || 0,
        errorDetails: reportData.errorDetails || '',
        timestamp: reportData.timestamp || new Date().toLocaleString('az-AZ'),
      }

      // Kullanıcı məlumatı
      try {
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          const u = JSON.parse(storedUser)
          payload.userEmail = u.email || u.username || ''
          payload.userName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || ''
          payload.userRole = u.role || ''
        }
      } catch {
        // ignore parse error
      }

      const res = await axiosInstance.post('/system/report-error', payload, {
        _suppressToast: true, // do not recursively toast if reporting itself fails
      })
      return res.data
    } catch (err) {
      console.error('Xəta hesabatı göndərilərkən xəta baş verdi:', err)
      throw err
    }
  },
}
