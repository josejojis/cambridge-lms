import { ClipboardCheck, ListChecks, RotateCcw, Timer } from 'lucide-react'
import { PageHeader, Section } from '../../../components/ui/Section'
import { ButtonLink } from '../../../components/ui/Button'

export function ExamCentrePage() {
  const items = [
    [ListChecks, 'Topic quizzes & practice tests', 'Short, instantly marked checks after each topic.'],
    [Timer, 'Timed mock examinations', 'A countdown timer, question navigation and autosave, just like exam conditions.'],
    [ClipboardCheck, 'Written answers marked by teachers', 'Long answers and essays are marked against marking schemes, with feedback.'],
    [RotateCcw, 'Review and retry', 'Model answers and explanations become available once results are released.'],
  ] as const
  return (
    <>
      <PageHeader eyebrow="Examination Centre" title="Practise under real exam conditions"
        intro="Topic quizzes, unit assessments and full mock examinations for Cambridge and CBC learners." />
      <Section>
        <ul className="grid gap-5 sm:grid-cols-2">
          {items.map(([Icon, t, b]) => (
            <li key={t} className="rounded-2xl border border-navy-900/10 p-6">
              <Icon className="text-gold-600" />
              <h2 className="mt-4 font-sans text-lg font-bold">{t}</h2>
              <p className="mt-2 text-muted">{b}</p>
            </li>
          ))}
        </ul>
        <div className="mt-10"><ButtonLink to="/register">Create an account to start</ButtonLink></div>
      </Section>
    </>
  )
}
