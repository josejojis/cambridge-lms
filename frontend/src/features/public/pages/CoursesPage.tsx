import { useState } from 'react'
import { BookOpen, Layers } from 'lucide-react'
import { PageHeader, Section, Notice } from '../../../components/ui/Section'
import { useApi } from '../../../lib/api'

interface Catalogue {
  data: {
    code: string; name: string; labels: Record<string, string>
    offerings: { subject: string; slug: string; level: string; units: number; courses: { title: string; slug: string; summary: string | null; lessons: number }[] }[]
  }[]
}

export function CoursesPage() {
  const { data, error, loading } = useApi<Catalogue>('/catalogue')
  const [tab, setTab] = useState('cambridge')
  const current = data?.data.find((c) => c.code === tab)

  return (
    <>
      <PageHeader eyebrow="Courses & subjects" title="Find your subject" intro="Browse subjects across Cambridge International and Kenya CBC." />
      <Section>
        <div role="tablist" aria-label="Curriculum" className="mb-8 inline-flex rounded-xl bg-navy-50 p-1">
          {[['cambridge', 'Cambridge'], ['cbc', 'Kenya CBC']].map(([code, label]) => (
            <button key={code} role="tab" aria-selected={tab === code} onClick={() => setTab(code)}
              className={`rounded-lg px-5 py-2 text-sm font-semibold ${tab === code ? 'bg-white text-navy-900 shadow-sm' : 'text-muted'}`}>{label}</button>
          ))}
        </div>

        {loading && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-navy-50" />)}</div>}
        {error && <Notice>We couldn’t load the course catalogue. Make sure the API is running, then refresh.</Notice>}

        {current && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {current.offerings.map((o) => (
              <li key={`${o.slug}-${o.level}`} className="flex flex-col rounded-2xl border border-navy-900/10 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-gold-600">{o.level}</p>
                <h2 className="mt-1 font-sans text-lg font-bold">{o.subject}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><Layers size={14} />{o.units} {current.labels.unit?.toLowerCase()}{o.units === 1 ? '' : 's'}</p>
                {o.courses.length > 0 ? (
                  <ul className="mt-4 space-y-2 border-t border-navy-900/10 pt-4">
                    {o.courses.map((c) => (
                      <li key={c.slug} className="flex items-start gap-2 text-sm">
                        <BookOpen size={16} className="mt-0.5 shrink-0 text-navy-700" />
                        <span><span className="font-semibold text-navy-900">{c.title}</span> <span className="text-muted">· {c.lessons} lessons</span></span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-4 border-t border-navy-900/10 pt-4 text-sm text-muted">Courses coming soon</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  )
}
