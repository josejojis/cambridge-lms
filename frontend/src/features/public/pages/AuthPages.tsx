import { useState, type ComponentProps, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { GraduationCap, Users } from 'lucide-react'
import { RegisterLearner, RegisterParent, type Me } from '@elite/shared'
import { Button } from '../../../components/ui/Button'
import { Logo } from '../../../components/layout/Logo'
import { api, ApiError } from '../../../lib/api'
import { authClient } from '../../../lib/auth-client'

export function Field({ label, error, ...props }: ComponentProps<'input'> & { label: string; error?: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-navy-900">
      {label}
      <input aria-invalid={!!error} className={`h-12 rounded-xl border px-4 font-normal focus:border-navy-700 ${error ? 'border-rose-500' : 'border-navy-900/20'}`} {...props} />
      {error && <span className="text-xs font-medium text-rose-700">{error}</span>}
    </label>
  )
}

function FormError({ message }: { message?: string }) {
  return message ? <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">{message}</div> : null
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy-900 p-12 lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(201,162,39,0.25),transparent_55%)]" />
        <div className="relative"><Logo light /></div>
        <p className="relative font-display text-4xl leading-tight text-white">Learn. Practise.<br />Prepare. <span className="italic text-gold-400">Succeed.</span></p>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-2 text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}

export function LoginPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const qc = useQueryClient()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const login = String(f.get('login')).trim(), password = String(f.get('password'))
    setBusy(true); setError(undefined)
    const res = login.includes('@')
      ? await authClient.signIn.email({ email: login, password })
      : await authClient.signIn.username({ username: login, password })
    setBusy(false)
    if (res.error) return setError(res.error.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : 'Those details don’t match an account.')
    if ((res.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) return nav('/login/two-factor')
    const me = await qc.fetchQuery({ queryKey: ['me'], queryFn: () => api<Me>('/me') })
    nav(me.home)
  }

  return (
    <AuthShell title={t('auth.welcome')} subtitle={<>New to Elite Revision? <Link className="font-semibold text-navy-900 underline" to="/register">Create an account</Link></>}>
      <form className="grid gap-4" onSubmit={onSubmit} noValidate>
        <FormError message={error} />
        <Field label={t('auth.loginOrEmail')} name="login" autoComplete="username webauthn" required />
        <Field label={t('auth.password')} name="password" type="password" autoComplete="current-password" required />
        <Button type="submit" variant="navy" size="lg" disabled={busy}>{busy ? 'Signing in…' : t('auth.login')}</Button>
        <button type="button" className="text-sm font-semibold text-navy-800 underline-offset-4 hover:underline"
          onClick={async () => { const r = await authClient.signIn.passkey(); if (!r?.error) { const me = await qc.fetchQuery({ queryKey: ['me'], queryFn: () => api<Me>('/me') }); nav(me.home) } }}>
          Sign in with a passkey
        </button>
      </form>
    </AuthShell>
  )
}

export function TwoFactorPage() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const [error, setError] = useState<string>()
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const code = String(new FormData(e.currentTarget).get('code')).replace(/\s/g, '')
    const res = await authClient.twoFactor.verifyTotp({ code, trustDevice: false })
    if (res.error) return setError('That code didn’t work. Check your authenticator app and try again.')
    const me = await qc.fetchQuery({ queryKey: ['me'], queryFn: () => api<Me>('/me') })
    nav(me.home)
  }
  return (
    <AuthShell title="Two-step verification" subtitle="Enter the 6-digit code from your authenticator app.">
      <form className="grid gap-4" onSubmit={onSubmit}>
        <FormError message={error} />
        <Field label="Code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={8} required />
        <Button type="submit" variant="navy" size="lg">Verify</Button>
      </form>
    </AuthShell>
  )
}

const LEVELS = {
  cambridge: [['Y1', 'Year 1'], ['Y2', 'Year 2'], ['Y3', 'Year 3'], ['Y4', 'Year 4'], ['Y5', 'Year 5'], ['Y6', 'Year 6'], ['Y7', 'Year 7'], ['Y8', 'Year 8'], ['Y9', 'Year 9'], ['IGCSE', 'IGCSE'], ['AS', 'AS Level'], ['AL', 'A Level']],
  cbc: [['PP1', 'PP1'], ['PP2', 'PP2'], ...Array.from({ length: 12 }, (_, i) => [`G${i + 1}`, `Grade ${i + 1}`])],
} as const

export function RegisterPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const [role, setRole] = useState<'learner' | 'parent'>(params.get('role') === 'parent' ? 'parent' : 'learner')
  const [curriculum, setCurriculum] = useState<'cambridge' | 'cbc'>(params.get('curriculum') === 'cbc' ? 'cbc' : 'cambridge')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    const payload = role === 'parent'
      ? { name: f.name, email: f.email, password: f.password, acceptTerms: f.acceptTerms === 'on' }
      : { name: f.name, username: f.username, password: f.password, curriculum, levelCode: f.levelCode,
          birthYear: Number(f.birthYear), birthMonth: Number(f.birthMonth), parentEmail: f.parentEmail || undefined, acceptTerms: f.acceptTerms === 'on' }
    // Same zod schema the API validates with: instant field errors, no round trip.
    const parsed = (role === 'parent' ? RegisterParent : RegisterLearner).safeParse(payload)
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.path[0] === 'acceptTerms' ? 'Please accept the terms to continue.' : i.message])))
      return
    }
    setErrors({}); setFormError(undefined); setBusy(true)
    try {
      const me = await api<Me>(`/register/${role}`, { method: 'POST', body: JSON.stringify(parsed.data) })
      qc.setQueryData(['me'], me)
      nav(me.home)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally { setBusy(false) }
  }

  const year = new Date().getFullYear()
  return (
    <AuthShell title={t('auth.create')} subtitle={<>Already registered? <Link className="font-semibold text-navy-900 underline" to="/login">Log in</Link></>}>
      <div role="radiogroup" aria-label="Account type" className="mb-6 grid grid-cols-2 gap-3">
        {([['learner', t('auth.learner'), GraduationCap], ['parent', t('auth.parent'), Users]] as const).map(([value, label, Icon]) => (
          <button key={value} type="button" role="radio" aria-checked={role === value} onClick={() => { setRole(value); setErrors({}) }}
            className={`flex items-center gap-2 rounded-xl border p-4 text-sm font-semibold ${role === value ? 'border-gold-500 bg-gold-100 text-navy-900' : 'border-navy-900/15 text-muted'}`}>
            <Icon size={18} />{label}
          </button>
        ))}
      </div>
      <form className="grid gap-4" onSubmit={onSubmit} noValidate>
        <FormError message={formError} />
        <Field label={t('auth.name')} name="name" autoComplete="name" error={errors.name} />
        {role === 'learner' ? (
          <>
            <Field label={t('auth.username')} name="username" autoComplete="username" error={errors.username} />
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-sm font-semibold text-navy-900">Curriculum
                <select className="h-12 rounded-xl border border-navy-900/20 px-3 font-normal" value={curriculum} onChange={(e) => setCurriculum(e.target.value as 'cambridge' | 'cbc')}>
                  <option value="cambridge">Cambridge</option><option value="cbc">Kenya CBC</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-navy-900">Level / grade
                <select name="levelCode" className="h-12 rounded-xl border border-navy-900/20 px-3 font-normal">
                  {LEVELS[curriculum].map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select>
              </label>
            </div>
            <fieldset className="grid grid-cols-2 gap-3">
              <legend className="mb-1.5 text-sm font-semibold text-navy-900">Birth month and year <span className="font-normal text-muted">(we don’t ask for the day)</span></legend>
              <select name="birthMonth" aria-label="Birth month" className="h-12 rounded-xl border border-navy-900/20 px-3">
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(2000, i).toLocaleString('en', { month: 'long' })}</option>)}
              </select>
              <select name="birthYear" aria-label="Birth year" defaultValue={year - 12} className="h-12 rounded-xl border border-navy-900/20 px-3">
                {Array.from({ length: 70 }, (_, i) => year - 3 - i).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </fieldset>
            <Field label="Parent or guardian’s email (optional)" name="parentEmail" type="email" autoComplete="off" error={errors.parentEmail} />
            <p className="text-xs leading-relaxed text-muted">If you are under 18, a parent or guardian must approve your account before lessons and exams unlock.</p>
          </>
        ) : (
          <Field label={t('auth.email')} name="email" type="email" autoComplete="email" error={errors.email} />
        )}
        <Field label={t('auth.password')} name="password" type="password" autoComplete="new-password" error={errors.password} />
        <label className="flex items-start gap-3 text-sm text-muted">
          <input type="checkbox" name="acceptTerms" className="mt-1 h-4 w-4 accent-navy-900" />
          <span>I agree to the <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.</span>
        </label>
        {errors.acceptTerms && <span className="-mt-2 text-xs font-medium text-rose-700">{errors.acceptTerms}</span>}
        <Button type="submit" size="lg" disabled={busy}>{busy ? 'Creating account…' : t('auth.createBtn')}</Button>
      </form>
    </AuthShell>
  )
}
