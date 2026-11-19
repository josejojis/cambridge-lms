import type { ReactNode } from 'react'

export function Section({
  id, eyebrow, title, intro, children, tone = 'white', className = '',
}: {
  id?: string; eyebrow?: string; title?: ReactNode; intro?: ReactNode; children?: ReactNode
  tone?: 'white' | 'tint' | 'navy'; className?: string
}) {
  const tones = { white: 'bg-white', tint: 'bg-navy-50', navy: 'bg-navy-900 text-white' }
  return (
    <section id={id} className={`${tones[tone]} py-16 sm:py-24 ${className}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {(eyebrow || title || intro) && (
          <header className="mb-10 max-w-2xl sm:mb-14">
            {eyebrow && (
              <p className={`mb-3 text-xs font-bold uppercase tracking-[0.18em] ${tone === 'navy' ? 'text-gold-400' : 'text-gold-600'}`}>
                {eyebrow}
              </p>
            )}
            {title && <h2 className={`text-3xl font-semibold sm:text-4xl ${tone === 'navy' ? 'text-white' : ''}`}>{title}</h2>}
            {intro && <p className={`mt-4 text-lg leading-relaxed ${tone === 'navy' ? 'text-navy-100' : 'text-muted'}`}>{intro}</p>}
          </header>
        )}
        {children}
      </div>
    </section>
  )
}

export function PageHeader({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: string }) {
  return (
    <div className="relative overflow-hidden bg-navy-900 text-white">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(201,162,39,0.18),transparent_45%)]" />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        {eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-gold-400">{eyebrow}</p>}
        <h1 className="max-w-3xl text-4xl font-semibold text-white sm:text-5xl">{title}</h1>
        {intro && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-navy-100">{intro}</p>}
      </div>
    </div>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div role="note" className="rounded-xl border border-gold-500/40 bg-gold-100 px-4 py-3 text-sm text-navy-900">
      {children}
    </div>
  )
}
