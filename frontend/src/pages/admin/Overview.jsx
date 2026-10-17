import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { money } from '../../lib/format'
import { Spinner } from '../../components/ui'

export default function Overview() {
  const [stats, setStats] = useState(null)
  const [low, setLow] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.rpc('admin_stats').then(({ data, error }) => (error ? setError(error.message) : setStats(data)))
    supabase.from('products').select('id,name,stock').lte('stock', 5).order('stock').limit(10).then(({ data }) => setLow(data || []))
  }, [])

  if (error) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>
  if (!stats) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>

  const cards = [['Products', stats.products], ['Orders', stats.orders], ['Revenue', money(stats.revenue)], ['Customers', stats.customers]]
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="card p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 font-display text-2xl font-bold">{value}</p></div>
        ))}
      </div>
      <section className="card p-5">
        <h2 className="text-lg font-bold">Low stock</h2>
        {low.length === 0 ? <p className="mt-2 text-sm text-slate-500">All products have healthy stock.</p> : (
          <ul className="mt-3 divide-y divide-slate-100">
            {low.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span>{p.name}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</span>
              </li>
            ))}
          </ul>
        )}
        <Link to="/admin/products" className="mt-3 inline-block text-sm font-semibold text-volt-600 hover:underline">Manage products</Link>
      </section>
    </div>
  )
}
