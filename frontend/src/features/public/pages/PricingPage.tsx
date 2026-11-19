import { Check } from 'lucide-react'
import { PageHeader, Section, Notice } from '../../../components/ui/Section'
import { ButtonLink } from '../../../components/ui/Button'
import { formatMoney, useApi } from '../../../lib/api'

interface Plan {
  slug: string; name: string; description: string | null; priceMinor: number; currency: string
  billingPeriod: 'free' | 'monthly' | 'termly' | 'annual'; trialDays: number; maxLearners: number; features: string[]
}
const per = { free: '', monthly: '/ month', termly: '/ term', annual: '/ year' }

export function PricingPage() {
  const { data, error, loading } = useApi<{ data: Plan[] }>('/plans')
  return (
    <>
      <PageHeader eyebrow="Pricing & subscriptions" title="Simple plans, paid your way" intro="Monthly, termly or annual billing, by M-Pesa or card." />
      <Section>
        {error && <Notice>We couldn’t load plans right now. Please try again shortly.</Notice>}
        {data?.data.some((p) => p.description?.includes('[DEMO PRICE]')) && (
          <Notice>Development environment: these prices are seeded demo values, not final pricing.</Notice>
        )}
        <ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {loading && Array.from({ length: 4 }, (_, i) => <li key={i} className="h-96 animate-pulse rounded-3xl bg-navy-50" />)}
          {data?.data.map((p) => {
            const featured = p.slug.startsWith('premium')
            return (
              <li key={p.slug} className={`flex flex-col rounded-3xl p-7 ${featured ? 'bg-navy-900 text-white ring-2 ring-gold-500' : 'ring-1 ring-navy-900/10'}`}>
                {featured && <span className="mb-3 self-start rounded-full bg-gold-500 px-2.5 py-0.5 text-xs font-bold text-navy-950">Most complete</span>}
                <h2 className={`text-2xl font-semibold ${featured ? 'text-white' : ''}`}>{p.name}</h2>
                <p className="mt-4">
                  <span className="font-display text-4xl font-semibold">{p.priceMinor === 0 ? 'Free' : formatMoney(p.priceMinor, p.currency)}</span>
                  <span className={`ml-1 text-sm ${featured ? 'text-navy-100' : 'text-muted'}`}>{per[p.billingPeriod]}</span>
                </p>
                <p className={`mt-2 text-sm ${featured ? 'text-navy-100' : 'text-muted'}`}>
                  {p.description?.replace('[DEMO PRICE] ', '')}
                  {p.maxLearners > 1 && ` Up to ${p.maxLearners} learners.`}
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {p.features.map((f) => <li key={f} className="flex gap-2"><Check size={18} className="shrink-0 text-gold-500" />{f}</li>)}
                </ul>
                {p.trialDays > 0 && <p className={`mt-4 text-xs ${featured ? 'text-gold-400' : 'text-gold-600'}`}>{p.trialDays}-day free trial</p>}
                <ButtonLink to="/register" variant={featured ? 'gold' : 'outline'} className="mt-6">Get started</ButtonLink>
              </li>
            )
          })}
        </ul>
      </Section>
    </>
  )
}
