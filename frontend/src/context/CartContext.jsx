import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

const CartContext = createContext(null)
export const useCart = () => useContext(CartContext)

const LS_KEY = 'suuqmart_cart'
const readLocal = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || [] } catch { return [] } }
const writeLocal = (lines) =>
  localStorage.setItem(LS_KEY, JSON.stringify(lines.map((l) => ({ id: l.product.id, quantity: l.quantity }))))

// A cart line is { product, quantity }.
export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const toast = useToast()
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(true)
  const userRef = useRef(null)
  userRef.current = user

  // Visitors: hydrate from localStorage. Logged in: merge local cart into cart_items, then load from Supabase.
  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const local = readLocal()
      if (!user) {
        if (local.length) {
          const { data } = await supabase.from('products').select('*').in('id', local.map((l) => l.id)).eq('is_active', true)
          if (!cancelled) setLines(local.map((l) => {
            const product = data?.find((p) => p.id === l.id)
            return product ? { product, quantity: Math.max(1, Math.min(l.quantity, product.stock || 1)) } : null
          }).filter(Boolean))
        } else if (!cancelled) setLines([])
      } else {
        if (local.length) {
          const [{ data: prods }, { data: existing }] = await Promise.all([
            supabase.from('products').select('id,stock').in('id', local.map((l) => l.id)),
            supabase.from('cart_items').select('product_id,quantity').eq('user_id', user.id),
          ])
          const rows = local.map((l) => {
            const p = prods?.find((x) => x.id === l.id)
            const have = existing?.find((e) => e.product_id === l.id)?.quantity || 0
            const qty = p ? Math.min(have + l.quantity, p.stock) : 0
            return qty > 0 ? { user_id: user.id, product_id: l.id, quantity: qty } : null
          }).filter(Boolean)
          if (rows.length) await supabase.from('cart_items').upsert(rows, { onConflict: 'user_id,product_id' })
          localStorage.removeItem(LS_KEY)
        }
        const { data } = await supabase.from('cart_items').select('quantity, product:products(*)').eq('user_id', user.id)
        if (!cancelled) setLines((data || []).filter((r) => r.product?.is_active).map((r) => ({ product: r.product, quantity: Math.min(r.quantity, r.product.stock) || 1 })))
      }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [user?.id, authLoading])

  const persist = useCallback(async (next, changedProductId, quantity) => {
    setLines(next)
    if (!userRef.current) { writeLocal(next); return }
    const uid = userRef.current.id
    const { error } = quantity > 0
      ? await supabase.from('cart_items').upsert({ user_id: uid, product_id: changedProductId, quantity }, { onConflict: 'user_id,product_id' })
      : await supabase.from('cart_items').delete().eq('user_id', uid).eq('product_id', changedProductId)
    if (error) toast.error('Could not save your cart. Try again.')
  }, [toast])

  const add = (product, qty = 1) => {
    const current = lines.find((l) => l.product.id === product.id)?.quantity || 0
    if (product.stock <= 0) return toast.error(`${product.name} is out of stock`)
    const target = Math.min(current + qty, product.stock)
    if (target === current) return toast.error(`Only ${product.stock} of ${product.name} available`)
    const next = current
      ? lines.map((l) => (l.product.id === product.id ? { ...l, quantity: target } : l))
      : [...lines, { product, quantity: target }]
    persist(next, product.id, target)
    toast.success(`${product.name} added to your bag`)
  }

  const setQty = (productId, qty) => {
    const line = lines.find((l) => l.product.id === productId)
    if (!line) return
    const target = Math.max(1, Math.min(qty, line.product.stock))
    persist(lines.map((l) => (l.product.id === productId ? { ...l, quantity: target } : l)), productId, target)
  }

  const remove = (productId) => persist(lines.filter((l) => l.product.id !== productId), productId, 0)

  // After a successful order the RPC already emptied cart_items on the server.
  const clear = () => { setLines([]); localStorage.removeItem(LS_KEY) }

  const count = lines.reduce((n, l) => n + l.quantity, 0)
  const subtotal = lines.reduce((n, l) => n + l.quantity * Number(l.product.price), 0)

  return (
    <CartContext.Provider value={{ lines, loading, count, subtotal, add, setQty, remove, clear }}>
      {children}
    </CartContext.Provider>
  )
}
