import { NavLink, Outlet } from 'react-router-dom'

const links = [['/admin', 'Overview', true], ['/admin/products', 'Products'], ['/admin/orders', 'Orders'], ['/admin/categories', 'Categories'], ['/admin/users', 'Users']]

export default function AdminLayout() {
  return (
    <div className="grid gap-6 md:grid-cols-[12rem_1fr]">
      <nav aria-label="Admin" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {links.map(([to, label, end]) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold ${isActive ? 'bg-navy-900 text-white' : 'text-navy-900 hover:bg-white'}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="min-w-0"><Outlet /></div>
    </div>
  )
}
