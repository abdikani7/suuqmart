import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { dateFmt } from '../../lib/format'
import { EmptyState, Spinner } from '../../components/ui'

export default function AdminUsers() {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).then(({ data }) => setRows(data || []))
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      {rows === null ? <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        : rows.length === 0 ? <EmptyState title="No users yet" />
        : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[30rem]">
              <thead className="border-b border-slate-100"><tr><th className="th">Name</th><th className="th">Phone</th><th className="th">Role</th><th className="th">Joined</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td className="td font-medium">{u.full_name || '—'}</td>
                    <td className="td text-slate-500">{u.phone || '—'}</td>
                    <td className="td"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.role === 'admin' ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-700'}`}>{u.role}</span></td>
                    <td className="td text-slate-500">{dateFmt(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      <p className="text-xs text-slate-500">Read-only. To make someone an admin, run the SQL in the README.</p>
    </div>
  )
}
