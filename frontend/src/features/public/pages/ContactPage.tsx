import { Mail, MapPin } from 'lucide-react'
import { PageHeader, Section, Notice } from '../../../components/ui/Section'
import { Field } from './AuthPages'
import { Button } from '../../../components/ui/Button'

export function ContactPage() {
  return (
    <>
      <PageHeader eyebrow="Contact" title="We’d love to hear from you" intro="Questions about subjects, schools, subscriptions or your account." />
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <ul className="space-y-5">
            <li className="flex gap-3"><Mail className="text-gold-600" /><span><strong className="block text-navy-900">Email</strong>support@elite-revision.com</span></li>
            <li className="flex gap-3"><MapPin className="text-gold-600" /><span><strong className="block text-navy-900">Location</strong>Nairobi, Kenya</span></li>
          </ul>
          <form className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
            <Notice>The contact form will send messages once the support API is connected.</Notice>
            <Field label="Your name" name="name" autoComplete="name" />
            <Field label="Email" name="email" type="email" autoComplete="email" />
            <label className="grid gap-1.5 text-sm font-semibold text-navy-900">Message
              <textarea name="message" rows={5} className="rounded-xl border border-navy-900/20 px-4 py-3 font-normal focus:border-navy-700" />
            </label>
            <Button type="submit" variant="navy" disabled>Send message</Button>
          </form>
        </div>
      </Section>
    </>
  )
}
