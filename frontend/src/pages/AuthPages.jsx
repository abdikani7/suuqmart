import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Field } from '../components/ui'

const emailOk = (v) => /^\S+@\S+\.\S+$/.test(v)

function Shell({ title, children, footer }) {
  return (
    <div className="mx-auto max-w-md py-8">
      <div className="card p-6 sm:p-8">
        <h1 className="mb-6 text-2xl font-bold">{title}</h1>
        {children}
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">{footer}</p>
    </div>
  )
}

export function Login() {
  const { user, signIn } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const from = useLocation().state?.from || '/'
  const [f, setF] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to={from} replace />

  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (!emailOk(f.email)) er.email = 'Enter a valid email address.'
    if (!f.password) er.password = 'Enter your password.'
    setErrors(er)
    if (Object.keys(er).length) return
    setBusy(true)
    const { error } = await signIn(f)
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success('Welcome back!')
    navigate(from, { replace: true })
  }

  return (
    <Shell title="Log in" footer={<>New to SuuqMart? <Link to="/signup" className="font-semibold text-volt-600 hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Email" htmlFor="l-email" error={errors.email}><input id="l-email" type="email" autoComplete="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Password" htmlFor="l-pw" error={errors.password}><input id="l-pw" type="password" autoComplete="current-password" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
    </Shell>
  )
}

export function Signup() {
  const { user, signUp } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [f, setF] = useState({ fullName: '', phone: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to="/" replace />

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (f.fullName.trim().length < 2) er.fullName = 'Enter your full name.'
    if (f.phone && !/^\+?[0-9 ()-]{7,16}$/.test(f.phone.trim())) er.phone = 'Enter a valid phone number.'
    if (!emailOk(f.email)) er.email = 'Enter a valid email address.'
    if (f.password.length < 8) er.password = 'Use at least 8 characters.'
    setErrors(er)
    if (Object.keys(er).length) return
    setBusy(true)
    const { data, error } = await signUp({ ...f, fullName: f.fullName.trim(), phone: f.phone.trim() })
    setBusy(false)
    if (error) return toast.error(error.message)
    if (!data.session) { toast.success('Check your email to confirm your account, then log in.'); navigate('/login') }
    else { toast.success('Account created. Welcome to SuuqMart!'); navigate('/') }
  }

  return (
    <Shell title="Create your account" footer={<>Already have an account? <Link to="/login" className="font-semibold text-volt-600 hover:underline">Log in</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Full name" htmlFor="s-name" error={errors.fullName}><input id="s-name" autoComplete="name" className="input" value={f.fullName} onChange={set('fullName')} /></Field>
        <Field label="Phone (optional)" htmlFor="s-phone" error={errors.phone}><input id="s-phone" autoComplete="tel" inputMode="tel" className="input" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Email" htmlFor="s-email" error={errors.email}><input id="s-email" type="email" autoComplete="email" className="input" value={f.email} onChange={set('email')} /></Field>
        <Field label="Password" htmlFor="s-pw" error={errors.password}><input id="s-pw" type="password" autoComplete="new-password" className="input" value={f.password} onChange={set('password')} /></Field>
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </Shell>
  )
}
