import api from './axios'

// Sənəd mərkəzi — müştəri / podratçı / investor üçün eyni interfeys.
// base: '/customers' | '/contractors' | '/investors'
export function makePartyDocsApi(base) {
  return {
    getAllDocuments: (id) => api.get(`${base}/${id}/all-documents`),

    uploadDocument: (id, file, documentName, documentDate) => {
      const fd = new FormData()
      fd.append('file', file)
      if (documentName) fd.append('documentName', documentName)
      if (documentDate) fd.append('documentDate', documentDate)
      return api.post(`${base}/${id}/all-documents`, fd, { headers: { 'Content-Type': undefined } })
    },

    deleteDocument: (id, documentId) =>
      api.delete(`${base}/${id}/all-documents/${documentId}`),

    downloadDocument: async (id, sourceType, sourceId, fileName) => {
      const res = await api.get(`${base}/${id}/all-documents/${sourceType}/${sourceId}/download`, {
        responseType: 'blob',
      })
      const cd = res.headers['content-disposition'] || ''
      const match = cd.match(/filename="?([^";\s]+)"?/)
      const serverName = match ? match[1] : null
      const name = fileName || serverName || 'sened'
      const url = URL.createObjectURL(
        new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' }),
      )
      const link = document.createElement('a')
      link.href = url
      link.download = name
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    },
  }
}
