import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Plus, Pencil, Trash2, ArrowLeft, BriefcaseBusiness } from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import { departmentsApi } from '../../api/departments'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { PageHeader, Field, Input, Select, Textarea, ModalShell, TableWrap, LoadingRow, EmptyRow } from './_shared'
import { fmt } from './_constants'

export default function PositionsPage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('HR_MANAGEMENT', 'canPost')
  const canEdit   = hasPermission('HR_MANAGEMENT', 'canPut')
  const canDelete = hasPermission('HR_MANAGEMENT', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [list, setList]               = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState({ open: false, editing: null })
  const [form, setForm]               = useState({ name: '', description: '', defaultSalary: '', departmentId: '', active: true })
  const [submitting, setSubmitting]   = useState(false)

  const load = async () => {
    setLoading(true)
    try { setList((await hrApi.getPositions()).data?.data ?? []) }
    catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Yüklənmədi') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    departmentsApi.getAll().then(r => setDepartments(r.data?.data ?? r.data ?? [])).catch(() => {})
  }, [])

  const open = (p) => {
    setForm(p
      ? { ...p, departmentId: p.departmentId || '' }
      : { name: '', description: '', defaultSalary: '', departmentId: '', active: true })
    setModal({ open: true, editing: p })
  }

  const save = async () => {
    if (!form.name?.trim()) { toast.error('Ad mütləqdir'); return }
    if (!form.departmentId) { toast.error('Şöbə seçilməlidir'); return }
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        defaultSalary: form.defaultSalary ? Number(form.defaultSalary) : null,
        departmentId:  form.departmentId  ? Number(form.departmentId)  : null,
      }
      if (modal.editing?.id) await hrApi.updatePosition(modal.editing.id, payload)
      else                   await hrApi.createPosition(payload)
      toast.success(modal.editing ? 'Yeniləndi' : 'Yaradıldı')
      setModal({ open: false, editing: null })
      load()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Xəta')
    } finally { setSubmitting(false) }
  }

  const remove = async (p) => {
    if (!(await confirm({ title: 'Vəzifəni sil', message: `"${p.name}" silinsin?` }))) return
    try { await hrApi.deletePosition(p.id); toast.success('Silindi'); load() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }

  return (
    <div style={{ color: 'var(--ces-ink)' }}>
      <ConfirmDialog />

      <PageHeader
        eyebrow="HR · Vəzifələr"
        title="Vəzifə kataloqu"
        subtitle={<><span className="num font-semibold" style={{ color: 'var(--ces-graphite)' }}>{list.length}</span> vəzifə qeyd olunub</>}
        right={
          <>
            <button onClick={() => navigate('/hr')} className="ces-btn ces-btn-outline ces-btn-sm">
              <ArrowLeft size={14} /> HR
            </button>
            {canCreate && (
              <button onClick={() => open(null)} className="ces-btn ces-btn-primary">
                <Plus size={16} /> Yeni vəzifə
              </button>
            )}
          </>
        }
      />

      <TableWrap>
        <div className="overflow-x-auto">
          <table className="ces-tbl w-full min-w-[720px]">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Şöbə</th>
                <th className="r">Default əməkhaqqı</th>
                <th>Təsvir</th>
                <th className="r w-act">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <LoadingRow colSpan={5} />
                : list.length === 0
                  ? <EmptyRow colSpan={5} icon={BriefcaseBusiness} message="Hələ heç bir vəzifə yoxdur" />
                  : list.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-7 h-7 rounded-[8px] grid place-items-center flex-none"
                            style={{ background: 'var(--ces-graphite-50)', color: 'var(--ces-graphite)' }}
                          >
                            <Briefcase size={13} />
                          </span>
                          <span className="text-[13.5px] font-bold" style={{ color: 'var(--ces-ink)' }}>{p.name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--ces-muted)' }}>{p.departmentName || '—'}</td>
                      <td className="r num" style={{ color: p.defaultSalary != null ? 'var(--ces-graphite-900)' : 'var(--ces-mute2)', fontWeight: p.defaultSalary != null ? 700 : 500 }}>
                        {p.defaultSalary != null ? `${fmt(p.defaultSalary)} ₼` : '—'}
                      </td>
                      <td style={{ color: 'var(--ces-muted)', fontSize: '12.5px' }}>{p.description || '—'}</td>
                      <td className="r">
                        <div className="flex justify-end gap-1">
                          {canEdit   && <button onClick={() => open(p)}   className="ces-row-act gold"   title="Redaktə"><Pencil size={14} /></button>}
                          {canDelete && <button onClick={() => remove(p)} className="ces-row-act danger" title="Sil"><Trash2 size={14} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </TableWrap>

      {modal.open && (
        <ModalShell
          icon={modal.editing ? Pencil : Briefcase}
          eyebrow={modal.editing ? 'Redaktə' : 'Yeni qeyd'}
          title={modal.editing ? modal.editing.name : 'Yeni vəzifə'}
          subtitle="Vəzifə adı, şöbə və default əməkhaqqı"
          onClose={() => setModal({ open: false, editing: null })}
          tone={modal.editing ? 'gold' : 'graphite'}
          maxWidth="520px"
          footer={
            <>
              <button onClick={() => setModal({ open: false, editing: null })} className="ces-btn ces-btn-ghost ces-btn-sm">Ləğv</button>
              <button onClick={save} disabled={submitting} className="ces-btn ces-btn-primary">
                {submitting && (
                  <span className="w-3.5 h-3.5 rounded-full animate-spin"
                    style={{ border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'var(--ces-on-primary)' }} />
                )}
                Yadda saxla
              </button>
            </>
          }
        >
          <div className="p-6 space-y-4">
            <Field label="Ad" required>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </Field>
            <Field label="Şöbə" required>
              <Select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">—</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="Default əməkhaqqı" hint="Yeni işçi əlavə edildikdə avtomatik təklif olunur">
              <Input type="number" step="0.01" value={form.defaultSalary} onChange={(e) => setForm({ ...form, defaultSalary: e.target.value })} suffix="₼" />
            </Field>
            <Field label="Təsvir">
              <Textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </Field>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
