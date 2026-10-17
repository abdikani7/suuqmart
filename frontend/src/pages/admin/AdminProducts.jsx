import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../context/ToastContext'
import { money } from '../../lib/format'
import { ConfirmModal, EmptyState, Field, Modal, Spinner } from '../../components/ui'

const PAGE = 8
const specsToText = (s) => Object.entries(s || {}).map(([k, v]) => `${k}: ${v}`).join('\n')
const textToSpecs = (t) => Object.fromEntries(t.split('\n').map((l) => l.split(/:(.*)/s)).filter((p) => p[0]?.trim() && p[1]?.trim()).map((p) => [p[0].trim(), p[1].trim()]))

export default function AdminProducts() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const [categories, setCategories] = useState([])
  const [editing, setEditing] = useState(null) // null | 'new' | product
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    let q = supabase.from('products').select('*, categories(name)', { count: 'exact' }).order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1)
    if (term) q = q.ilike('name', `%${term}%`)
    const { data, count, error } = await q
    if (error) toast.error(error.message)
    setRows(data || []); setTotal(count || 0)
  }, [page, term, toast])

  useEffect(() => { load() }, [load])
  useEffect(() => { supabase.from('categories').select('*').order('name').then(({ data }) => setCategories(data || [])) }, [])

  const remove = async () => {
    setBusy(true)
    const { error } = await supabase.from('products').delete().eq('id', deleting.id)
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success('Product deleted'); setDeleting(null); load()
  }

  const pages = Math.max(1, Math.ceil(total / PAGE))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products</h1>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>Add product</button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); setPage(0); setTerm(search.trim()) }} role="search" className="flex gap-2">
        <label htmlFor="p-search" className="sr-only">Search products</label>
        <input id="p-search" className="input max-w-sm" placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn btn-ghost">Search</button>
      </form>
      {rows === null ? <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        : rows.length === 0 ? <EmptyState title="No products found" text="Add a product or change your search." />
        : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[40rem]">
              <thead className="border-b border-slate-100"><tr><th className="th">Product</th><th className="th">Category</th><th className="th">Price</th><th className="th">Stock</th><th className="th">Status</th><th className="th"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="td"><div className="flex items-center gap-3"><div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-navy-800">{p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}</div><span className="font-medium">{p.name}</span></div></td>
                    <td className="td text-slate-500">{p.categories?.name || '—'}</td>
                    <td className="td">{money(p.price)}</td>
                    <td className={`td ${p.stock <= 5 ? 'font-semibold text-amber-700' : ''}`}>{p.stock}</td>
                    <td className="td">{p.is_active ? 'Active' : 'Hidden'}</td>
                    <td className="td whitespace-nowrap text-right">
                      <button className="mr-3 text-sm font-semibold text-volt-600 hover:underline" onClick={() => setEditing(p)}>Edit</button>
                      <button className="text-sm font-semibold text-red-600 hover:underline" onClick={() => setDeleting(p)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">{total} products · Page {page + 1} of {pages}</span>
        <div className="flex gap-2">
          <button className="btn btn-ghost !py-1.5" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <button className="btn btn-ghost !py-1.5" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>

      {editing && <ProductForm product={editing === 'new' ? null : editing} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      {deleting && <ConfirmModal title="Delete product?" message={`"${deleting.name}" will be removed from the store. Past orders keep their item names.`} busy={busy} onConfirm={remove} onClose={() => setDeleting(null)} />}
    </div>
  )
}

function ProductForm({ product, categories, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState({
    name: product?.name || '', description: product?.description || '', price: product?.price ?? '', stock: product?.stock ?? '',
    category_id: product?.category_id || '', specs: specsToText(product?.specs), is_active: product?.is_active ?? true,
  })
  const [images, setImages] = useState(product?.gallery?.length ? product.gallery : product?.image_url ? [product.image_url] : [])
  const [errors, setErrors] = useState({})
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const upload = async (e) => {
    const files = [...e.target.files]
    if (!files.length) return
    setUploading(true)
    const urls = []
    for (const file of files) {
      if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: use an image under 5 MB`); continue }
      const path = `${crypto.randomUUID()}.${file.name.split('.').pop()}`
      const { error } = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type })
      if (error) { toast.error(error.message); continue }
      urls.push(supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl)
    }
    setImages((i) => [...i, ...urls]); setUploading(false); e.target.value = ''
  }

  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (f.name.trim().length < 2) er.name = 'Enter a product name.'
    if (f.price === '' || Number(f.price) < 0) er.price = 'Enter a price of 0 or more.'
    if (f.stock === '' || !Number.isInteger(Number(f.stock)) || Number(f.stock) < 0) er.stock = 'Enter a whole number of 0 or more.'
    setErrors(er)
    if (Object.keys(er).length) return
    setBusy(true)
    const payload = {
      name: f.name.trim(), description: f.description.trim(), price: Number(f.price), stock: Number(f.stock),
      category_id: f.category_id || null, specs: textToSpecs(f.specs), is_active: f.is_active,
      image_url: images[0] || null, gallery: images,
    }
    const { error } = product ? await supabase.from('products').update(payload).eq('id', product.id) : await supabase.from('products').insert(payload)
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success(product ? 'Product updated' : 'Product added')
    onSaved()
  }

  return (
    <Modal title={product ? 'Edit product' : 'Add product'} onClose={onClose} wide>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Name" htmlFor="pf-name" error={errors.name}><input id="pf-name" className="input" value={f.name} onChange={set('name')} /></Field>
        <Field label="Description" htmlFor="pf-desc"><textarea id="pf-desc" rows={3} className="input" value={f.description} onChange={set('description')} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (USD)" htmlFor="pf-price" error={errors.price}><input id="pf-price" type="number" min="0" step="0.01" className="input" value={f.price} onChange={set('price')} /></Field>
          <Field label="Stock" htmlFor="pf-stock" error={errors.stock}><input id="pf-stock" type="number" min="0" step="1" className="input" value={f.stock} onChange={set('stock')} /></Field>
        </div>
        <Field label="Category" htmlFor="pf-cat">
          <select id="pf-cat" className="input" value={f.category_id} onChange={set('category_id')}>
            <option value="">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Specs (one per line, Name: value)" htmlFor="pf-specs"><textarea id="pf-specs" rows={4} className="input font-mono" placeholder={'RAM: 16 GB\nStorage: 512 GB'} value={f.specs} onChange={set('specs')} /></Field>
        <div>
          <label className="label" htmlFor="pf-img">Images (the first is the main image)</label>
          <input id="pf-img" type="file" accept="image/*" multiple onChange={upload} className="text-sm" />
          {uploading && <p className="mt-2 text-sm text-slate-500">Uploading…</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {images.map((src, i) => (
              <div key={src} className="relative h-20 w-20 overflow-hidden rounded-lg ring-1 ring-slate-200">
                <img src={src} alt={`Product image ${i + 1}`} className="h-full w-full object-cover" />
                <button type="button" aria-label={`Remove image ${i + 1}`} onClick={() => setImages(images.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded bg-navy-900/80 px-1.5 text-xs text-white">✕</button>
              </div>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> Visible in the store</label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || uploading}>{busy ? 'Saving…' : 'Save product'}</button>
        </div>
      </form>
    </Modal>
  )
}
