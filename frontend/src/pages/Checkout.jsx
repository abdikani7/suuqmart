import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { money } from '../lib/format'
import { EmptyState, Field } from '../components/ui'

export default function Checkout() {
  const { profile } = useAuth()
  const { lines, subtotal, loading, clear } = useCart()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', address: '', payment: 'cash_on_delivery', momoNumber: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState('')

  useEffect(() => {
    if (profile) setForm((f) => ({ ...f, name: f.name || profile.full_name || '', phone: f.phone || profile.phone || '' }))
  }, [profile])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const validate = () => {
    const e = {}
    if (form.name.trim().length < 2) e.name = 'Enter your full name.'
    if (!/^\+?[0-9 ()-]{7,16}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number.'
    if (form.address.trim().length < 6) e.address = 'Enter your full delivery address.'
    if (form.payment === 'mobile_money' && !/^\+?[0-9 ()-]{7,16}$/.test(form.momoNumber.trim())) e.momoNumber = 'Enter the mobile money number you will pay from.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setBusy(true)
    try {
      if (form.payment === 'mobile_money') {
        // Simulation only: no real money moves.
        setStep('Waiting for mobile money approval…')
        await new Promise((r) => setTimeout(r, 1800))
      }
      setStep('Placing your order…')
      const { error } = await supabase.rpc('place_order', {
        p_name: form.name, p_phone: form.phone, p_address: form.address, p_payment: form.payment,
        p_items: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      })
      if (error) throw error
      clear()
      toast.success('Order placed. Thank you!')
      navigate('/orders')
    } catch (err) {
      toast.error(err.message || 'Could not place your order.')
    } finally {
      setBusy(false); setStep('')
    }
  }

  if (loading) return null
  if (lines.length === 0) return <EmptyState title="Nothing to check out" text="Your bag is empty." action={<Link to="/products" className="btn btn-primary">Browse products</Link>} />

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Checkout</h1>
        <section className="card space-y-4 p-5">
          <h2 className="text-lg font-bold">Delivery details</h2>
          <Field label="Full name" htmlFor="c-name" error={errors.name}><input id="c-name" className="input" value={form.name} onChange={set('name')} autoComplete="name" /></Field>
          <Field label="Phone number" htmlFor="c-phone" error={errors.phone}><input id="c-phone" className="input" value={form.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" /></Field>
          <Field label="Delivery address" htmlFor="c-addr" error={errors.address}><textarea id="c-addr" rows={3} className="input" value={form.address} onChange={set('address')} autoComplete="street-address" /></Field>
        </section>
        <section className="card space-y-3 p-5">
          <h2 className="text-lg font-bold">Payment method</h2>
          {[['cash_on_delivery', 'Cash on delivery', 'Pay the courier when your order arrives.'], ['mobile_money', 'Mobile money (simulated)', 'Demo only. No real payment is taken.']].map(([val, title, text]) => (
            <label key={val} className={`flex cursor-pointer gap-3 rounded-xl p-3 ring-1 ${form.payment === val ? 'bg-blue-50 ring-volt-500' : 'ring-slate-200'}`}>
              <input type="radio" name="payment" value={val} checked={form.payment === val} onChange={set('payment')} className="mt-1" />
              <span><span className="block text-sm font-semibold">{title}</span><span className="text-sm text-slate-500">{text}</span></span>
            </label>
          ))}
          {form.payment === 'mobile_money' && (
            <Field label="Mobile money number" htmlFor="c-momo" error={errors.momoNumber}>
              <input id="c-momo" className="input" value={form.momoNumber} onChange={set('momoNumber')} inputMode="tel" placeholder="e.g. 61 555 0123" />
            </Field>
          )}
        </section>
      </div>
      <aside className="card h-fit space-y-3 p-5 lg:sticky lg:top-28">
        <h2 className="text-lg font-bold">Order summary</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {lines.map(({ product, quantity }) => (
            <li key={product.id} className="flex justify-between gap-3 py-2"><span>{quantity} × {product.name}</span><span className="font-medium">{money(product.price * quantity)}</span></li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-slate-100 pt-3"><span className="font-semibold">Total</span><span className="font-display text-xl font-bold">{money(subtotal)}</span></div>
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? step || 'Working…' : 'Place order'}</button>
      </aside>
    </form>
  )
}
