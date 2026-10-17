import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import ProductCard from '../components/ProductCard'
import { EmptyState, ProductGridSkeleton } from '../components/ui'

export default function Products() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const category = params.get('category') || ''
  const min = params.get('min') || ''
  const max = params.get('max') || ''
  const sort = params.get('sort') || 'newest'

  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ q, min, max })

  useEffect(() => { setForm({ q, min, max }) }, [q, min, max])
  useEffect(() => { supabase.from('categories').select('*').order('name').then(({ data }) => setCategories(data || [])) }, [])

  useEffect(() => {
    let cancelled = false
    setProducts(null); setError('')
    let query = supabase.from('products').select(category ? '*, categories!inner(slug)' : '*').eq('is_active', true)
    if (q) query = query.ilike('name', `%${q}%`)
    if (category) query = query.eq('categories.slug', category)
    if (min !== '') query = query.gte('price', Number(min))
    if (max !== '') query = query.lte('price', Number(max))
    if (sort === 'price_asc') query = query.order('price', { ascending: true })
    else if (sort === 'price_desc') query = query.order('price', { ascending: false })
    else query = query.order('created_at', { ascending: false })
    query.then(({ data, error }) => {
      if (cancelled) return
      if (error) setError(error.message)
      setProducts(data || [])
    })
    return () => { cancelled = true }
  }, [q, category, min, max, sort])

  const update = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next)
  }
  const apply = (e) => { e.preventDefault(); update({ q: form.q.trim(), min: form.min, max: form.max }) }
  const hasFilters = q || category || min || max

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <aside>
        <form onSubmit={apply} className="card space-y-4 p-4 lg:sticky lg:top-28">
          <div>
            <label className="label" htmlFor="f-q">Search</label>
            <input id="f-q" className="input" value={form.q} onChange={(e) => setForm({ ...form, q: e.target.value })} placeholder="Product name" />
          </div>
          <div>
            <label className="label" htmlFor="f-cat">Category</label>
            <select id="f-cat" className="input" value={category} onChange={(e) => update({ category: e.target.value })}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <span className="label">Price range (USD)</span>
            <div className="flex items-center gap-2">
              <input aria-label="Minimum price" type="number" min="0" className="input" placeholder="Min" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} />
              <input aria-label="Maximum price" type="number" min="0" className="input" placeholder="Max" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary w-full">Apply filters</button>
          {hasFilters && <Link to="/products" className="block text-center text-sm font-medium text-volt-600 hover:underline">Clear all</Link>}
        </form>
      </aside>

      <section aria-live="polite">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{category ? categories.find((c) => c.slug === category)?.name || 'Products' : 'All products'}</h1>
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm text-slate-500">Sort by</label>
            <select id="sort" className="input !w-auto" value={sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>
        </div>
        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">Couldn't load products: {error}</p>}
        {products === null ? <ProductGridSkeleton />
          : products.length === 0 ? (
            <EmptyState title="No products match" text="Try a different search term or widen the price range."
              action={<Link to="/products" className="btn btn-primary">Clear filters</Link>} />
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          )}
      </section>
    </div>
  )
}
