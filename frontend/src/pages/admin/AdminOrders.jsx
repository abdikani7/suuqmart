import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../context/ToastContext'
import { STATUSES, dateFmt, money, paymentLabel } from '../../lib/format'
import { EmptyState, Modal, Spinner, StatusBadge } from '../../components/ui'

export default function AdminOrders() {
  const toast = useToast()
  const [orders, setOrders] = useState(null)
  const [filter, setFilter] = useState('')
  const [open, setOpen] = useState(null)

  const load = useCallback(async () => {
    let q = supabase.from('orders').select('*, profiles(full_name), order_items(*)').order('created_at', { ascending: false })
    if (filter) q = q.eq('status', filter)
    const { data, error } = await q
    if (error) toast.error(error.message)
    setOrders(data || [])
  }, [filter, toast])
  useEffect(() => { load() }, [load])

  const setStatus = async (order, status) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', order.id)
    if (error) return toast.error(error.message)
    toast.success(`Order #${order.id.slice(0, 8)} is now ${status}`)
    setOpen((o) => (o ? { ...o, status } : o)); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="o-filter" className="text-sm text-slate-500">Status</label>
          <select id="o-filter" className="input !w-auto" value={filter} onChange={(e) => { setOrders(null); setFilter(e.target.value) }}>
            <option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {orders === null ? <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        : orders.length === 0 ? <EmptyState title="No orders" text="Orders will appear here as customers check out." />
        : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[42rem]">
              <thead className="border-b border-slate-100"><tr><th className="th">Order</th><th className="th">Customer</th><th className="th">Date</th><th className="th">Total</th><th className="th">Status</th><th className="th"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="td font-medium">#{o.id.slice(0, 8)}</td>
                    <td className="td">{o.shipping_name}</td>
                    <td className="td text-slate-500">{dateFmt(o.created_at)}</td>
                    <td className="td">{money(o.total)}</td>
                    <td className="td"><StatusBadge status={o.status} /></td>
                    <td className="td text-right"><button className="text-sm font-semibold text-volt-600 hover:underline" onClick={() => setOpen(o)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {open && (
        <Modal title={`Order #${open.id.slice(0, 8)}`} onClose={() => setOpen(null)} wide>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Customer</dt><dd className="font-medium">{open.shipping_name} ({open.profiles?.full_name || 'no profile name'})</dd></div>
            <div><dt className="text-slate-500">Phone</dt><dd className="font-medium">{open.shipping_phone}</dd></div>
            <div className="sm:col-span-2"><dt className="text-slate-500">Delivery address</dt><dd className="font-medium">{open.shipping_address}</dd></div>
            <div><dt className="text-slate-500">Payment</dt><dd className="font-medium">{paymentLabel[open.payment_method]}</dd></div>
            <div><dt className="text-slate-500">Placed</dt><dd className="font-medium">{dateFmt(open.created_at)}</dd></div>
          </dl>
          <ul className="mt-4 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
            {open.order_items.map((i) => <li key={i.id} className="flex justify-between gap-3 px-3 py-2 text-sm"><span>{i.quantity} × {i.product_name}</span><span>{money(i.quantity * i.unit_price)}</span></li>)}
            <li className="flex justify-between px-3 py-2 font-semibold"><span>Total</span><span>{money(open.total)}</span></li>
          </ul>
          <div className="mt-5 flex items-center gap-3">
            <label htmlFor="o-status" className="text-sm font-medium">Update status</label>
            <select id="o-status" className="input !w-auto" value={open.status} onChange={(e) => setStatus(open, e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {open.status === 'cancelled' && <p className="mt-2 text-xs text-slate-500">Cancelling an order returns its items to stock.</p>}
        </Modal>
      )}
    </div>
  )
}
