import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import { Logo } from './Logo'
import { Button, ButtonLink } from '../ui/Button'
import { PwaPrompts } from '../pwa/PwaPrompts'
import { useMe, useSignOut } from '../../lib/session'
import { setLanguage } from '../../lib/i18n'

const navKeys = [
  { to: '/cambridge', key: 'nav.cambridge' },
  { to: '/cbc', key: 'nav.cbc' },
  { to: '/courses', key: 'nav.courses' },
  { to: '/exam-centre', key: 'nav.exams' },
  { to: '/pricing', key: 'nav.pricing' },
  { to: '/about', key: 'nav.about' },
]

function AccountActions() {
  const { t, i18n } = useTranslation()
  const { data: me } = useMe()
  const signOut = useSignOut()
  const go = useNavigate()
  return (
    <>
      <button className="rounded-lg px-2 py-2 text-xs font-bold uppercase text-muted hover:text-navy-900"
        aria-label="Change language" onClick={() => setLanguage(i18n.language === 'sw' ? 'en' : 'sw')}>
        {i18n.language === 'sw' ? 'EN' : 'SW'}
      </button>
      {me ? (
        <>
          <ButtonLink to={me.home} variant="outline">{t('nav.account')}</ButtonLink>
          <Button variant="navy" onClick={async () => { await signOut(); go('/') }}>{t('nav.logout')}</Button>
        </>
      ) : (
        <>
          <ButtonLink to="/login" variant="outline">{t('nav.login')}</ButtonLink>
          <ButtonLink to="/register">{t('nav.start')}</ButtonLink>
        </>
      )}
    </>
  )
}

export function PublicLayout() {
  const { t } = useTranslation()
  const nav = navKeys.map((n) => ({ to: n.to, label: t(n.key) }))
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-navy-900/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to}
                className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'text-navy-900 bg-navy-50' : 'text-muted hover:text-navy-900'}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex"><AccountActions /></div>
          <button className="rounded-lg p-2 text-navy-900 lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <nav aria-label="Mobile" className="border-t border-navy-900/10 bg-white px-4 pb-5 pt-2 lg:hidden">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} className="block rounded-lg px-3 py-3 font-medium text-navy-900 hover:bg-navy-50">{n.label}</NavLink>
            ))}
            <div className="mt-3 flex flex-wrap items-center gap-2"><AccountActions /></div>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1"><Outlet /></main>

      <footer className="bg-navy-950 text-navy-100">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-1">
            <Logo light />
            <p className="mt-4 text-sm leading-relaxed text-navy-100/80">Learn. Practise. Prepare. Succeed.</p>
          </div>
          {[
            { h: 'Learn', l: [['/cambridge', 'Cambridge International'], ['/cbc', 'Kenya CBC'], ['/courses', 'Courses & subjects'], ['/exam-centre', 'Examination Centre']] },
            { h: 'Company', l: [['/about', 'About us'], ['/pricing', 'Pricing'], ['/contact', 'Contact']] },
            { h: 'Legal', l: [['/terms', 'Terms & Conditions'], ['/privacy', 'Privacy Policy']] },
          ].map((col) => (
            <div key={col.h}>
              <h3 className="font-sans text-sm font-semibold uppercase tracking-widest text-gold-400">{col.h}</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.l.map(([to, label]) => <li key={to}><Link className="hover:text-white" to={to}>{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-navy-100/60 sm:px-6">
            © {new Date().getFullYear()} Elite Revision · elite-revision.com. Elite Revision is an independent learning platform and is not affiliated with,
            or endorsed by, Cambridge University Press &amp; Assessment or the Kenya Institute of Curriculum Development.
          </p>
        </div>
      </footer>
      <PwaPrompts />
    </div>
  )
}
