import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useCart } from '../context/CartContext'
import { money } from '../lib/format'
import { EmptyState, StockBadge } from '../components/ui'

export default function ProductDetails() {
  const { id } = useParams()
  const { add, lines } = useCart()
  const [product, setProduct] = useState(undefined)
  const [active, setActive] = useState(0)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    setProduct(undefined); setActive(0); setQty(1)
    supabase.from('products').select('*, categories(name, slug)').eq('id', id).maybeSingle()
      .then(({ data }) => setProduct(data))
  }, [id])

  if (product === undefined) {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <div className="skeleton aspect-square" />
        <div className="space-y-4"><div className="skeleton h-8 w-2/3" /><div className="skeleton h-6 w-1/4" /><div className="skeleton h-24 w-full" /></div>
      </div>
    )
  }
  if (!product) return <EmptyState title="Product not found" text="It may have been removed." action={<Link to="/products" className="btn btn-primary">Back to shop</Link>} />

  const images = product.gallery?.length ? product.gallery : product.image_url ? [product.image_url] : []
  const inBag = lines.find((l) => l.product.id === product.id)?.quantity || 0
  const maxMore = Math.max(0, product.stock - inBag)
  const specs = Object.entries(product.specs || {})

  return (
    <div>
      <nav className="mb-4 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/products" className="hover:underline">Shop</Link>
        {product.categories && <> / <Link to={`/products?category=${product.categories.slug}`} className="hover:underline">{product.categories.name}</Link></>}
      </nav>
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl bg-navy-800">
            {images[active] && <img src={images[active]} alt={`${product.name}, image ${active + 1}`} className="h-full w-full object-cover" />}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((src, i) => (
                <button key={src + i} onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`} aria-current={i === active}
                  className={`h-16 w-16 overflow-hidden rounded-lg ring-2 ${i === active ? 'ring-volt-500' : 'ring-transparent'}`}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-extrabold">{product.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <p className="font-display text-3xl font-bold">{money(product.price)}</p>
            <StockBadge stock={product.stock} />
          </div>
          <p className="mt-5 whitespace-pre-line text-slate-600">{product.description}</p>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center rounded-xl bg-white ring-1 ring-slate-300">
              <button className="px-3 py-2.5" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
              <button className="px-3 py-2.5" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(Math.max(1, maxMore), q + 1))}>+</button>
            </div>
            <button className="btn btn-primary flex-1" disabled={maxMore <= 0}
              onClick={() => add(product, qty)}>
              {product.stock <= 0 ? 'Out of stock' : maxMore <= 0 ? 'Max quantity in bag' : 'Add to bag'}
            </button>
          </div>
          {inBag > 0 && <p className="mt-2 text-sm text-slate-500">{inBag} in your bag. <Link to="/cart" className="font-semibold text-volt-600 hover:underline">View bag</Link></p>}

          {specs.length > 0 && (
            <div className="card mt-8 overflow-hidden">
              <h2 className="px-4 pt-4 text-lg font-bold">Specifications</h2>
              <dl className="mt-2 divide-y divide-slate-100">
                {specs.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-3 gap-4 px-4 py-2.5 text-sm"><dt className="text-slate-500">{k}</dt><dd className="col-span-2 font-medium">{String(v)}</dd></div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
