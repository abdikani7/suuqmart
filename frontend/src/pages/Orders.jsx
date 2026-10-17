import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { dateFmt, money, paymentLabel } from '../lib/format'
import { EmptyState, Spinner, StatusBadge } from '../components/ui'

export default function Orders() {
  const [orders, setOrders] = useState(null)
  useEffect(() => {
    supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false })
      .then(({ data }) => setOrders(data || []))
  }, [])

  if (!orders) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
  if (!orders.length) return <EmptyState title="No orders yet" text="Orders you place will be listed here with their status." action={<Link to="/products" className="btn btn-primary">Shop now</Link>} />

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold">Your orders</h1>
      <ul className="space-y-4">
        {orders.map((o) => (
          <li key={o.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm text-slate-500">Order #{o.id.slice(0, 8)} · {dateFmt(o.created_at)}</p>
                <p className="text-sm text-slate-500">{paymentLabel[o.payment_method]}</p>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {o.order_items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 py-2"><span>{i.quantity} × {i.product_name}</span><span>{money(i.quantity * i.unit_price)}</span></li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm">
              <span className="text-slate-500">Deliver to {o.shipping_name}, {o.shipping_address}</span>
              <span className="font-display text-lg font-bold">{money(o.total)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
