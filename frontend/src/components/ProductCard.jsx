import { Link } from 'react-router-dom'
import { money } from '../lib/format'
import { useCart } from '../context/CartContext'
import { StockBadge } from './ui'

export default function ProductCard({ product }) {
  const { add } = useCart()
  const out = product.stock <= 0
  return (
    <article className="card flex flex-col overflow-hidden p-3">
      <Link to={`/products/${product.id}`} className="block">
        <div className="aspect-square overflow-hidden rounded-xl bg-navy-800">
          {product.image_url
            ? <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
            : <div className="flex h-full items-center justify-center text-4xl font-bold text-volt-400" aria-hidden="true">{product.name[0]}</div>}
        </div>
        <h3 className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5">{product.name}</h3>
      </Link>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="font-display text-lg font-bold">{money(product.price)}</p>
        <StockBadge stock={product.stock} />
      </div>
      <button className="btn btn-primary mt-3 w-full" disabled={out} onClick={() => add(product)}>
        {out ? 'Out of stock' : 'Add to bag'}
      </button>
    </article>
  )
}
