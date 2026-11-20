import { useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowRight, Atom, BarChart3, BookOpen, Check, ChevronDown, ClipboardCheck, Cpu, FlaskConical, GraduationCap,
  Languages, Leaf, Microscope, PenLine, ShieldCheck, Sigma, Timer, Users, type LucideIcon,
} from 'lucide-react'
import { ButtonLink } from '../../../components/ui/Button'
import { Section } from '../../../components/ui/Section'
import { curricula, faqs, featuredSubjects, steps } from '../content'

const icons: Record<string, LucideIcon> = { Sigma, BookOpen, Leaf, FlaskConical, Atom, Microscope, Languages, Cpu }

export function HomePage() {
  return (
    <>
      <Hero />
      <Curricula />
      <Subjects />
      <HowItWorks />
      <Features />
      <Parents />
      <PlansTeaser />
      <Faq />
      <ContactCta />
    </>
  )
}

function Hero() {
  return (
    <div className="relative overflow-hidden bg-navy-900">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(201,162,39,0.22),transparent_50%),radial-gradient(ellipse_at_0%_100%,rgba(27,65,120,0.9),transparent_55%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-gold-400">
            Cambridge International · Kenya CBC
          </p>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.08] text-white sm:text-6xl">
            Learn. Practise.<br />Prepare. <span className="italic text-gold-400">Succeed.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-100">
            Elite Revision brings structured lessons, exam-style practice and clear progress reports together in one place,
            for learners, parents and teachers.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink to="/register" size="lg">Create a free account <ArrowRight size={18} /></ButtonLink>
            <ButtonLink to="/courses" size="lg" variant="ghost-light">Explore subjects</ButtonLink>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-navy-100">
            {['Pay with M-Pesa or card', 'Parent progress reports', 'Works on any device'].map((t) => (
              <li key={t} className="flex items-center gap-2"><Check size={16} className="text-gold-400" />{t}</li>
            ))}
          </ul>
        </div>
        <SampleQuestionCard />
      </div>
    </div>
  )
}

function SampleQuestionCard() {
  const options = ['x = 2', 'x = 3', 'x = 4', 'x = 6']
  const [picked, setPicked] = useState<number | null>(null)
  const correct = 2
  return (
    <figure className="relative mx-auto w-full max-w-md">
      <div aria-hidden className="absolute -inset-3 rotate-2 rounded-3xl bg-gold-500/20" />
      <div className="relative rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="rounded-full bg-navy-50 px-2.5 py-1 text-navy-800">Try a sample question</span>
          <span className="flex items-center gap-1 text-muted"><Timer size={14} /> Mathematics · 1 mark</span>
        </div>
        <p className="mt-5 font-display text-xl text-navy-900">Solve for <em>x</em>: &nbsp;3x + 5 = 17</p>
        <div className="mt-5 grid gap-2.5" role="radiogroup" aria-label="Answer options">
          {options.map((o, i) => {
            const state = picked === null ? 'idle' : i === correct ? 'right' : i === picked ? 'wrong' : 'idle'
            return (
              <button key={o} role="radio" aria-checked={picked === i} disabled={picked !== null} onClick={() => setPicked(i)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors
                  ${state === 'right' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : state === 'wrong' ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-navy-900/15 hover:border-navy-700 hover:bg-navy-50'}`}>
                <span className="grid h-6 w-6 place-items-center rounded-full bg-navy-900/5 text-xs font-bold">{String.fromCharCode(65 + i)}</span>{o}
              </button>
            )
          })}
        </div>
        <figcaption className="mt-4 min-h-10 text-sm text-muted">
          {picked === null ? 'Choose an answer to see instant feedback.' : picked === correct
            ? 'Correct! Subtract 5 from both sides (3x = 12), then divide by 3.'
            : 'Not quite. Subtract 5 from both sides first: 3x = 12, so x = 4.'}
        </figcaption>
      </div>
    </figure>
  )
}

function Curricula() {
  return (
    <Section eyebrow="Two curricula, one platform" title="Built for Cambridge and Kenya CBC learners"
      intro="Each curriculum keeps its own structure and terms, while sharing the same lessons, practice and reporting tools.">
      <div className="grid gap-6 md:grid-cols-2">
        {(['cambridge', 'cbc'] as const).map((key) => {
          const c = curricula[key]
          return (
            <Link key={key} to={`/${key}`} className="group rounded-3xl border border-navy-900/10 bg-white p-7 transition-shadow hover:shadow-xl sm:p-8">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-navy-900 text-gold-400"><GraduationCap /></span>
                <h3 className="text-2xl font-semibold">{c.name}</h3>
              </div>
              <p className="mt-4 leading-relaxed text-muted">{c.blurb}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {c.stages.map((s) => <li key={s} className="rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-800">{s}</li>)}
              </ul>
              <span className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 group-hover:text-gold-600">
                Explore {c.short} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          )
        })}
      </div>
    </Section>
  )
}

function Subjects() {
  return (
    <Section tone="tint" eyebrow="Featured subjects" title="Core subjects, from first steps to final exams">
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {featuredSubjects.map((s) => {
          const Icon = icons[s.icon]
          return (
            <li key={s.name} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy-900/5">
              <Icon className="text-gold-600" />
              <p className="mt-4 font-semibold text-navy-900">{s.name}</p>
              <p className="mt-1 text-xs text-muted">{s.levels}</p>
            </li>
          )
        })}
      </ul>
      <div className="mt-10"><ButtonLink to="/courses" variant="navy">View all courses <ArrowRight size={16} /></ButtonLink></div>
    </Section>
  )
}

function HowItWorks() {
  return (
    <Section eyebrow="How it works" title="A clear path from lesson to exam day">
      <ol className="grid gap-6 md:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="relative">
            <span className="font-display text-5xl font-semibold text-gold-600">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="mt-3 font-sans text-lg font-bold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}

function Features() {
  const items: [LucideIcon, string, string][] = [
    [BookOpen, 'Study notes & worked examples', 'Topic notes with diagrams, worked examples and downloadable revision sheets.'],
    [PenLine, '8 question formats', 'Multiple choice, true/false, fill-in-the-blank, matching, multi-select, short answer, long answer and essay.'],
    [Timer, 'Timed mock exams', 'Exam-style timing, question navigation and autosave, so an interruption doesn’t lose your answers.'],
    [ClipboardCheck, 'Teacher marking', 'Teachers mark written answers using marking schemes and add personal feedback.'],
    [BarChart3, 'Performance analytics', 'Scores by subject and topic, improvement over time, and revision suggestions.'],
    [ShieldCheck, 'Safe by design', 'Parental consent, minimal personal data and strict access controls for children’s records.'],
  ]
  return (
    <Section tone="navy" eyebrow="Learning & examination features" title="Everything you need to revise with purpose">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([Icon, t, b]) => (
          <li key={t} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <Icon className="text-gold-400" />
            <h3 className="mt-4 font-sans text-lg font-bold text-white">{t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-navy-100">{b}</p>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Parents() {
  return (
    <Section>
      <div className="grid items-center gap-10 rounded-3xl bg-gold-100 p-8 sm:p-12 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">For parents</p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Stay involved, without looking over their shoulder</h2>
          <p className="mt-4 text-lg leading-relaxed text-navy-800">
            Link each of your children to one parent account. You’ll see their progress, exam results and topics that need attention,
            and you can manage subscriptions in one place.
          </p>
          <div className="mt-8"><ButtonLink to="/register?role=parent" variant="navy">Create a parent account</ButtonLink></div>
        </div>
        <ul className="grid gap-3">
          {[
            [Users, 'Several children, one account'],
            [BarChart3, 'Subject and topic performance charts'],
            [ClipboardCheck, 'Results and downloadable progress reports'],
            [ShieldCheck, 'You approve your child’s account and consent'],
          ].map(([Icon, t]) => {
            const I = Icon as LucideIcon
            return (
              <li key={t as string} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-900 text-gold-400"><I size={20} /></span>
                <span className="font-semibold text-navy-900">{t as string}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </Section>
  )
}

function PlansTeaser() {
  const plans = [
    { name: 'Free', body: 'Sample lessons and practice questions in every subject.' },
    { name: 'Basic', body: 'Full lessons and practice for your chosen subjects.' },
    { name: 'Premium', body: 'All subjects, mock exams, teacher marking and parent reports.', featured: true },
    { name: 'Exam Prep', body: 'Intensive timed mocks and revision plans before exams.' },
  ]
  return (
    <Section tone="tint" eyebrow="Subscription packages" title="Plans for every stage of revision"
      intro="Pay monthly, termly or annually by M-Pesa or card. Final prices will be published at launch.">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <li key={p.name} className={`flex flex-col rounded-2xl p-6 ${p.featured ? 'bg-navy-900 text-white ring-2 ring-gold-500' : 'bg-white ring-1 ring-navy-900/10'}`}>
            {p.featured && <span className="mb-3 self-start rounded-full bg-gold-500 px-2.5 py-0.5 text-xs font-bold text-navy-950">Most complete</span>}
            <h3 className={`text-2xl font-semibold ${p.featured ? 'text-white' : ''}`}>{p.name}</h3>
            <p className={`mt-2 flex-1 text-sm leading-relaxed ${p.featured ? 'text-navy-100' : 'text-muted'}`}>{p.body}</p>
          </li>
        ))}
      </ul>
      <div className="mt-10"><ButtonLink to="/pricing" variant="navy">Compare plans <ArrowRight size={16} /></ButtonLink></div>
    </Section>
  )
}

function Faq() {
  return (
    <Section eyebrow="FAQ" title="Frequently asked questions">
      <div className="divide-y divide-navy-900/10 rounded-2xl border border-navy-900/10">
        {faqs.map((f) => (
          <details key={f.q} className="group p-5 sm:p-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-navy-900">
              {f.q}<ChevronDown size={18} className="shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 leading-relaxed text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </Section>
  )
}

function ContactCta() {
  return (
    <Section tone="navy">
      <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">Ready to start revising?</h2>
          <p className="mt-3 text-navy-100">Questions about schools, plans or content? <Link to="/contact" className="font-semibold text-gold-400 underline-offset-4 hover:underline">Contact our team</Link>.</p>
        </div>
        <ButtonLink to="/register" size="lg">Create a free account <ArrowRight size={18} /></ButtonLink>
      </div>
    </Section>
  )
}
