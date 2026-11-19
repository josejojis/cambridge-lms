import { PageHeader, Section } from '../../../components/ui/Section'

export function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="About us" title="Revision that respects the curriculum and the learner"
        intro="Elite Revision is an online learning and exam-preparation platform for Cambridge International and Kenya CBC learners." />
      <Section>
        <div className="grid gap-10 md:grid-cols-3">
          {[
            ['Our mission', 'To give every learner structured, high-quality revision and honest feedback on how they are doing, wherever they study.'],
            ['Our content', 'Our notes and practice questions are written by our own editorial team and follow the published curriculum structures. We do not reproduce copyrighted examination papers.'],
            ['Our promise to families', 'Children’s data is handled carefully: we collect only what we need, ask for parental consent, and never sell personal information.'],
          ].map(([h, b]) => (
            <div key={h}>
              <h2 className="text-2xl font-semibold">{h}</h2>
              <p className="mt-3 leading-relaxed text-muted">{b}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}
