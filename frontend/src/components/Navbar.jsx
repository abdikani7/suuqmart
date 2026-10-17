import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export default function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuth()
  const { count } = useCart()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const search = (e) => {
    e.preventDefault()
    navigate(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : '/products')
  }
  const link = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white'}`

  return (
    <header className="sticky top-0 z-40 bg-navy-900 text-white shadow-lg shadow-navy-950/20">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link to="/" aria-label="SuuqMart home"><Logo /></Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
          <NavLink to="/products" className={link}>Shop</NavLink>
          {user && <NavLink to="/orders" className={link}>Orders</NavLink>}
          {isAdmin && <NavLink to="/admin" className={link}>Admin</NavLink>}
        </nav>
        <form onSubmit={search} role="search" className="order-last w-full sm:order-none sm:ml-auto sm:w-72 sm:flex-none">
          <label htmlFor="nav-search" className="sr-only">Search products</label>
          <input id="nav-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search laptops, phones, parts…"
            className="w-full rounded-xl border-0 bg-navy-800 px-3.5 py-2 text-sm text-white placeholder:text-slate-400 focus:ring-2 focus:ring-volt-500" />
        </form>
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <Link to="/cart" className="relative rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:text-white" aria-label={`Bag, ${count} items`}>
            Bag
            {count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-volt-500 px-1 text-xs font-bold">{count}</span>}
          </Link>
          {user ? (
            <button onClick={signOut} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white" title={profile?.full_name || user.email}>Log out</button>
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:text-white">Log in</Link>
              <Link to="/signup" className="btn btn-primary !py-2">Sign up</Link>
            </>
          )}
        </div>
      </div>
      <nav className="flex gap-1 border-t border-white/10 px-3 py-1 sm:hidden" aria-label="Mobile">
        <NavLink to="/products" className={link}>Shop</NavLink>
        {user && <NavLink to="/orders" className={link}>Orders</NavLink>}
        {isAdmin && <NavLink to="/admin" className={link}>Admin</NavLink>}
      </nav>
    </header>
  )
}
