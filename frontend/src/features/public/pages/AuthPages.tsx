import { useState, type ComponentProps } from 'react'
import { Link, useSearchParams } from 'react-router'
import { GraduationCap, Users } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Logo } from '../../../components/layout/Logo'
import { Notice } from '../../../components/ui/Section'

export function Field({ label, ...props }: ComponentProps<'input'> & { label: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-navy-900">
      {label}
      <input className="h-12 rounded-xl border border-navy-900/20 px-4 font-normal focus:border-navy-700" {...props} />
    </label>
  )
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
  return (
    <AuthShell title="Welcome back" subtitle={<>New to Elite Revision? <Link className="font-semibold text-navy-900 underline" to="/register">Create an account</Link></>}>
      <form className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
        <Notice>Sign-in will be enabled when the authentication API is connected (Phase 1).</Notice>
        <Field label="Email or username" name="login" autoComplete="username" />
        <Field label="Password" name="password" type="password" autoComplete="current-password" />
        <Button type="submit" variant="navy" size="lg" disabled>Log in</Button>
      </form>
    </AuthShell>
  )
}

export function RegisterPage() {
  const [params] = useSearchParams()
  const [role, setRole] = useState<'learner' | 'parent'>(params.get('role') === 'parent' ? 'parent' : 'learner')
  return (
    <AuthShell title="Create your account" subtitle={<>Already registered? <Link className="font-semibold text-navy-900 underline" to="/login">Log in</Link></>}>
      <div role="radiogroup" aria-label="Account type" className="mb-6 grid grid-cols-2 gap-3">
        {([['learner', 'I’m a learner', GraduationCap], ['parent', 'I’m a parent', Users]] as const).map(([value, label, Icon]) => (
          <button key={value} type="button" role="radio" aria-checked={role === value} onClick={() => setRole(value)}
            className={`flex items-center gap-2 rounded-xl border p-4 text-sm font-semibold ${role === value ? 'border-gold-500 bg-gold-100 text-navy-900' : 'border-navy-900/15 text-muted'}`}>
            <Icon size={18} />{label}
          </button>
        ))}
      </div>
      <form className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
        <Notice>Registration will be enabled when the authentication API is connected (Phase 1).</Notice>
        <Field label="Full name" name="name" autoComplete="name" />
        {role === 'learner'
          ? <Field label="Username" name="username" autoComplete="username" />
          : <Field label="Email" name="email" type="email" autoComplete="email" />}
        <Field label="Password" name="password" type="password" autoComplete="new-password" />
        {role === 'learner' && (
          <p className="text-xs leading-relaxed text-muted">If you are under 18, a parent or guardian must approve your account before you can start lessons and exams.</p>
        )}
        <Button type="submit" size="lg" disabled>Create account</Button>
      </form>
    </AuthShell>
  )
}
