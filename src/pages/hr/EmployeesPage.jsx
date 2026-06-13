import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search, Users, Eye, FileDown, ArrowLeft } from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import { departmentsApi } from '../../api/departments'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'
import EmployeeModal from './EmployeeModal'
import EmployeeSlideOver from './EmployeeSlideOver'
import Pagination from '../../components/common/Pagination'
import { PageHeader, Pill, Avatar, TableWrap, LoadingRow, EmptyRow } from './_shared'
import { fmt, EMPLOYEE_STATUS } from './_constants'

export default function EmployeesPage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('HR_MANAGEMENT', 'canPost')
  const canEdit   = hasPermission('HR_MANAGEMENT', 'canPut')
  const canDelete = hasPermission('HR_MANAGEMENT', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()
  const searchRef = useRef(null)

  const [data, setData]           = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState({ open: false, editing: null })
  const [slideOver, setSlideOver] = useState(null)
  const [positions, setPositions] = useState([])
  const [departments, setDepartments] = useState([])

  const [searchParams, setSearchParams] = useSearchParams()
  const search       = searchParams.get('q')      || ''
  const statusFilter = searchParams.get('status') || ''
  const page = Number(searchParams.get('page') || '0')
  const size = Number(searchParams.get('size') || '15')

  const setSearch = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('q', v) : n.delete('q'); n.delete('page'); return n }, { replace: true })
  const setStatus = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('status', v) : n.delete('status'); n.delete('page'); return n }, { replace: true })
  const setPage   = (p) => setSearchParams(prev => { const n = new URLSearchParams(prev); p > 0 ? n.set('page', String(p)) : n.delete('page'); return n }, { replace: true })
  const setPageSize = (s) => setSearchParams(prev => { const n = new URLSearchParams(prev); s !== 15 ? n.set('size', String(s)) : n.delete('size'); n.delete('page'); return n }, { replace: true })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, size, ...(search && { q: search }), ...(statusFilter && { status: statusFilter }) }
      const res = await hrApi.getEmployeesPaged(params)
      setData(res.data.data || res.data)
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'İşçilər yüklənmədi')
    } finally { setLoading(false) }
  }, [page, size, search, statusFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    hrApi.getPositions().then(r => setPositions(r.data?.data ?? r.data ?? [])).catch(() => {})
    departmentsApi.getAll().then(r => setDepartments(r.data?.data ?? r.data ?? [])).catch(() => {})
  }, [])

  const handleDelete = async (e) => {
    if (!(await confirm({ title: 'İşçini sil', message: `"${e.fullName}" işçisini silmək istəyirsiniz?` }))) return
    try {
      await hrApi.deleteEmployee(e.id)
      toast.success('İşçi silindi')
      load()
    } catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Silmə uğursuz oldu') }
  }

  const handleTerminate = async (e) => {
    const reason = window.prompt('İşdən çıxma səbəbi:')
    if (reason === null) return
    try {
      await hrApi.terminateEmployee(e.id, { reason, terminationDate: new Date().toISOString().slice(0, 10) })
      toast.success('İşçi işdən çıxarıldı')
      load()
    } catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Əməliyyat uğursuz oldu') }
  }

  const exportExcel = () => {
    const rows = data.content.map(e => ({
      'Kod':              e.employeeCode || '',
      'Ad Soyad':         e.fullName || '',
      'FİN':              e.fin || '',
      'Vəzifə':           e.positionName || '',
      'Şöbə':             e.departmentName || '',
      'Əməkhaqqı (Gross)': e.grossSalary || 0,
      'Telefon':          e.phone || '',
      'Email':            e.email || '',
      'İşə qəbul':        e.hireDate || '',
      'Status':           EMPLOYEE_STATUS[e.status]?.label || e.status,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [12, 25, 14, 18, 18, 14, 14, 22, 12, 14].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'İşçilər')
    XLSX.writeFile(wb, 'isciler.xlsx')
  }

  return (
    <div style={{ color: 'var(--ces-ink)' }}>
      <ConfirmDialog />

      <PageHeader
        eyebrow="HR · İşçilər"
        title="İşçilər"
        subtitle={<><span className="num font-semibold" style={{ color: 'var(--ces-graphite)' }}>{data.totalElements}</span> işçi qeyd olunub</>}
        right={
          <>
            <button onClick={() => navigate('/hr')} className="ces-btn ces-btn-outline ces-btn-sm">
              <ArrowLeft size={14} /> HR
            </button>
            <button onClick={exportExcel} className="ces-btn ces-btn-outline ces-btn-sm">
              <FileDown size={14} /> Excel
            </button>
            {canCreate && (
              <button onClick={() => setModal({ open: true, editing: null })} className="ces-btn ces-btn-primary">
                <Plus size={16} /> Yeni işçi
              </button>
            )}
          </>
        }
      />

      <TableWrap>
        {/* Toolbar */}
        <div
          className="flex items-center justify-between gap-3 flex-wrap"
          style={{ padding: '18px 22px', borderBottom: '1px solid var(--ces-line)' }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div
              className="flex items-center gap-2 flex-1 max-w-[340px]"
              style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '10px', padding: '0 12px', minHeight: '38px' }}
            >
              <Search size={14} style={{ color: 'var(--ces-mute2)' }} />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ad, soyad, FİN, kod..."
                className="flex-1 outline-none bg-transparent text-[13px]"
                style={{ color: 'var(--ces-ink)' }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatus(e.target.value)}
              className="text-[13px] font-medium cursor-pointer"
              style={{
                padding: '8px 12px',
                background: 'var(--ces-surface)',
                border: '1px solid var(--ces-line)',
                borderRadius: '10px',
                color: 'var(--ces-graphite)',
                outline: 'none',
                minHeight: '38px',
              }}
            >
              <option value="">Bütün statuslar</option>
              {Object.entries(EMPLOYEE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="ces-tbl w-full min-w-[900px]">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Ad Soyad</th>
                <th>FİN</th>
                <th>Vəzifə</th>
                <th>Şöbə</th>
                <th className="r">Əməkhaqqı</th>
                <th>Status</th>
                <th className="r w-act">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingRow colSpan={8} />
              ) : data.content.length === 0 ? (
                <EmptyRow colSpan={8} icon={Users} message="İşçi tapılmadı" />
              ) : data.content.map((e) => {
                const s = EMPLOYEE_STATUS[e.status] || { label: e.status, tone: 'muted' }
                return (
                  <tr
                    key={e.id}
                    onClick={() => setSlideOver(e)}
                    className="cursor-pointer"
                  >
                    <td className="mono" style={{ color: 'var(--ces-muted)', fontSize: '12.5px' }}>{e.employeeCode || '—'}</td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={e.fullName} size="sm" />
                        <span className="text-[13.5px] font-bold" style={{ color: 'var(--ces-ink)' }}>{e.fullName}</span>
                      </div>
                    </td>
                    <td className="mono" style={{ color: 'var(--ces-muted)', fontSize: '12.5px' }}>{e.fin || '—'}</td>
                    <td style={{ color: 'var(--ces-ink)' }}>{e.positionName || '—'}</td>
                    <td style={{ color: 'var(--ces-muted)', fontSize: '12.5px' }}>{e.departmentName || '—'}</td>
                    <td className="r num" style={{ color: 'var(--ces-graphite-900)', fontWeight: 700 }}>{fmt(e.grossSalary)} ₼</td>
                    <td><Pill tone={s.tone} sm dot>{s.label}</Pill></td>
                    <td className="r" onClick={(ev) => ev.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSlideOver(e)} className="ces-row-act info" title="Bax"><Eye size={14} /></button>
                        {canEdit && (
                          <button onClick={() => setModal({ open: true, editing: e })} className="ces-row-act gold" title="Redaktə et"><Pencil size={14} /></button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(e)} className="ces-row-act danger" title="Sil"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {data.totalPages > 0 && (
          <Pagination
            page={data.page + 1}
            pageSize={data.size}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            onPage={(p) => setPage(p - 1)}
            onPageSize={(s) => setPageSize(s)}
          />
        )}
      </TableWrap>

      {modal.open && (
        <EmployeeModal
          editing={modal.editing}
          positions={positions}
          departments={departments}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => { setModal({ open: false, editing: null }); load() }}
        />
      )}

      {slideOver && (
        <EmployeeSlideOver
          employee={slideOver}
          onClose={() => setSlideOver(null)}
          onEdit={() => { setModal({ open: true, editing: slideOver }); setSlideOver(null) }}
          onTerminate={() => handleTerminate(slideOver)}
        />
      )}
    </div>
  )
}
