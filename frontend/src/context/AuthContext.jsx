import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Persistent session: Supabase stores it in localStorage and refreshes the token.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      if (!data.session) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session) { setProfile(null); setLoading(false) }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Load the profile (and its role) whenever the signed-in user changes.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
      if (!cancelled) { setProfile(data); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [user?.id])

  const signUp = ({ email, password, fullName, phone }) =>
    supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, phone } } })
  const signIn = ({ email, password }) => supabase.auth.signInWithPassword({ email, password })
  const signOut = () => supabase.auth.signOut()

  const updateProfile = async (fields) => {
    const { data, error } = await supabase.from('profiles').update(fields).eq('id', user.id).select().single()
    if (!error) setProfile(data)
    return { data, error }
  }

  const value = {
    user, profile, loading,
    isAdmin: profile?.role === 'admin',
    signUp, signIn, signOut, updateProfile,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
