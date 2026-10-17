export const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n || 0))

export const dateFmt = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

export const statusStyle = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-700',
}

export const paymentLabel = { cash_on_delivery: 'Cash on delivery', mobile_money: 'Mobile money' }

export const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export const stockInfo = (stock) =>
  stock <= 0
    ? { label: 'Out of stock', cls: 'bg-red-100 text-red-700' }
    : stock <= 5
      ? { label: `Only ${stock} left`, cls: 'bg-amber-100 text-amber-800' }
      : { label: 'In stock', cls: 'bg-emerald-100 text-emerald-800' }
