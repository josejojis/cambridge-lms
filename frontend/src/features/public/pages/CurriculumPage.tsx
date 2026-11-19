import { ArrowRight, ChevronRight } from 'lucide-react'
import { PageHeader, Section } from '../../../components/ui/Section'
import { ButtonLink } from '../../../components/ui/Button'
import { curricula } from '../content'

export function CurriculumPage({ curriculum }: { curriculum: 'cambridge' | 'cbc' }) {
  const c = curricula[curriculum]
  return (
    <>
      <PageHeader eyebrow="Curriculum" title={c.name} intro={c.blurb} />
      <Section eyebrow="Stages" title="Choose your level">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {c.stages.map((s) => (
            <li key={s} className="flex items-center justify-between rounded-2xl border border-navy-900/10 p-5 font-semibold text-navy-900">
              {s}<ChevronRight size={18} className="text-gold-600" />
            </li>
          ))}
        </ul>
      </Section>
      <Section tone="tint" eyebrow="How content is organised" title={`The ${c.short} learning path`}>
        <ol className="flex flex-wrap items-center gap-2">
          {c.hierarchy.map((h, i) => (
            <li key={h} className="flex items-center gap-2">
              <span className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-navy-900 shadow-sm">{h}</span>
              {i < c.hierarchy.length - 1 && <ArrowRight size={16} className="text-gold-600" />}
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-2xl text-muted">
          Every lesson, practice question and exam links to this structure. That is how your progress reports can show exactly which
          {curriculum === 'cbc' ? ' strands and sub-strands' : ' units and topics'} need more work.
        </p>
        <div className="mt-8"><ButtonLink to={`/register?curriculum=${curriculum}`}>Start learning <ArrowRight size={16} /></ButtonLink></div>
      </Section>
    </>
  )
}
