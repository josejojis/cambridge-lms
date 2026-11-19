import { PageHeader, Section, Notice } from '../../../components/ui/Section'

function LegalDraft({ title, sections }: { title: string; sections: [string, string][] }) {
  return (
    <>
      <PageHeader eyebrow="Legal" title={title} />
      <Section>
        <div className="max-w-3xl">
          <Notice>Draft outline only. Final wording must be reviewed by a qualified legal adviser before launch.</Notice>
          {sections.map(([h, b]) => (
            <div key={h} className="mt-10">
              <h2 className="text-2xl font-semibold">{h}</h2>
              <p className="mt-3 leading-relaxed text-muted">{b}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}

export function TermsPage() {
  return <LegalDraft title="Terms and Conditions" sections={[
    ['Accounts', 'You are responsible for keeping your login details secure. Learners under 18 need a parent or guardian’s approval.'],
    ['Subscriptions', 'Paid access starts after the payment provider confirms payment, and runs for the billing period of the plan you chose.'],
    ['Acceptable use', 'Do not share accounts, copy or redistribute course content, or try to interfere with examinations.'],
    ['Independence', 'Elite Revision is not affiliated with Cambridge University Press & Assessment or KICD.'],
  ]} />
}

export function PrivacyPage() {
  return <LegalDraft title="Privacy Policy" sections={[
    ['What we collect', 'Only what we need to provide learning: name, username or email, curriculum and grade, and learning activity. We do not ask for a learner’s full date of birth or phone number.'],
    ['Children’s data', 'Under Kenya’s Data Protection Act, 2019, we process a child’s data only with a parent or guardian’s consent, and only in the child’s interest.'],
    ['Payments', 'Payments are processed by M-Pesa and our card provider. We never store M-Pesa PINs, full card numbers or card security codes.'],
    ['Your rights', 'You can ask to see, correct or delete your data, and you can withdraw consent at any time.'],
  ]} />
}
