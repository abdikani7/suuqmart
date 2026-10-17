import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './ui'

// Client-side guard. The real protection is RLS on the server.
export default function ProtectedRoute({ children, admin = false }) {
  const { user, isAdmin, profile, loading } = useAuth()
  const location = useLocation()
  if (loading || (user && !profile)) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (admin && !isAdmin) return <Navigate to="/" replace />
  return children
}
