import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { money } from '../lib/format'
import { EmptyState, Spinner } from '../components/ui'

export default function Cart() {
  const { lines, loading, count, subtotal, setQty, remove } = useCart()
  const navigate = useNavigate()

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
  if (lines.length === 0) {
    return <EmptyState title="Your bag is empty" text="Add a few products and they'll show up here." action={<Link to="/products" className="btn btn-primary">Start shopping</Link>} />
  }

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold">Your bag ({count})</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <ul className="space-y-3">
          {lines.map(({ product, quantity }) => (
            <li key={product.id} className="card flex gap-4 p-3">
              <Link to={`/products/${product.id}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-navy-800">
                {product.image_url && <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="flex justify-between gap-3">
                  <Link to={`/products/${product.id}`} className="font-semibold hover:underline">{product.name}</Link>
                  <p className="font-display font-bold">{money(product.price * quantity)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center rounded-lg ring-1 ring-slate-300">
                    <button className="px-3 py-1.5" aria-label={`Decrease quantity of ${product.name}`} onClick={() => setQty(product.id, quantity - 1)} disabled={quantity <= 1}>−</button>
                    <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                    <button className="px-3 py-1.5" aria-label={`Increase quantity of ${product.name}`} onClick={() => setQty(product.id, quantity + 1)} disabled={quantity >= product.stock}>+</button>
                  </div>
                  <button className="text-sm font-medium text-red-600 hover:underline" onClick={() => remove(product.id)}>Remove</button>
                </div>
                {quantity >= product.stock && <p className="text-xs text-amber-700">Maximum available quantity</p>}
              </div>
            </li>
          ))}
        </ul>
        <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-28">
          <h2 className="text-lg font-bold">Order summary</h2>
          <div className="flex justify-between text-sm"><span className="text-slate-500">Items</span><span>{count}</span></div>
          <div className="flex justify-between border-t border-slate-100 pt-4"><span className="font-semibold">Subtotal</span><span className="font-display text-xl font-bold">{money(subtotal)}</span></div>
          <button className="btn btn-primary w-full" onClick={() => navigate('/checkout')}>Go to checkout</button>
          <Link to="/products" className="block text-center text-sm font-medium text-volt-600 hover:underline">Keep shopping</Link>
        </aside>
      </div>
    </div>
  )
}
