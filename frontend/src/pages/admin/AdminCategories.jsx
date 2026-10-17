import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../context/ToastContext'
import { slugify } from '../../lib/format'
import { ConfirmModal, EmptyState, Field, Modal, Spinner } from '../../components/ui'

export default function AdminCategories() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    setRows(data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const openForm = (c) => { setEditing(c); setName(c === 'new' ? '' : c.name); setError('') }

  const save = async (e) => {
    e.preventDefault()
    if (name.trim().length < 2) return setError('Enter a category name.')
    setBusy(true)
    const payload = { name: name.trim(), slug: slugify(name) }
    const { error: err } = editing === 'new' ? await supabase.from('categories').insert(payload) : await supabase.from('categories').update(payload).eq('id', editing.id)
    setBusy(false)
    if (err) return setError(err.message.includes('duplicate') ? 'A category with that name already exists.' : err.message)
    toast.success(editing === 'new' ? 'Category added' : 'Category updated'); setEditing(null); load()
  }

  const remove = async () => {
    setBusy(true)
    const { error: err } = await supabase.from('categories').delete().eq('id', deleting.id)
    setBusy(false)
    if (err) return toast.error(err.message)
    toast.success('Category deleted'); setDeleting(null); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Categories</h1><button className="btn btn-primary" onClick={() => openForm('new')}>Add category</button></div>
      {rows === null ? <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        : rows.length === 0 ? <EmptyState title="No categories" text="Add your first category to organise products." />
        : (
          <ul className="card divide-y divide-slate-100">
            {rows.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-3">
                <div><p className="font-medium">{c.name}</p><p className="text-xs text-slate-500">/{c.slug}</p></div>
                <div className="flex gap-3 text-sm font-semibold">
                  <button className="text-volt-600 hover:underline" onClick={() => openForm(c)}>Edit</button>
                  <button className="text-red-600 hover:underline" onClick={() => setDeleting(c)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      {editing && (
        <Modal title={editing === 'new' ? 'Add category' : 'Edit category'} onClose={() => setEditing(null)}>
          <form onSubmit={save} noValidate className="space-y-4">
            <Field label="Name" htmlFor="cat-name" error={error}><input id="cat-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
            <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save category'}</button></div>
          </form>
        </Modal>
      )}
      {deleting && <ConfirmModal title="Delete category?" message={`"${deleting.name}" will be deleted. Its products stay in the store with no category.`} busy={busy} onConfirm={remove} onClose={() => setDeleting(null)} />}
    </div>
  )
}
