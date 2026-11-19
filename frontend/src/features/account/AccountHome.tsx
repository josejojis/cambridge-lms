import { Navigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CalendarClock, Check, Lock, X } from 'lucide-react'
import { api } from '../../lib/api'
import { useMe } from '../../lib/session'
import { Button } from '../../components/ui/Button'
import { Notice } from '../../components/ui/Section'

/**
 * Signed-in landing page until the full role dashboards (Phase 5) are built.
 * Everything here is live data from the API.
 */
export function AccountHome() {
  const { t } = useTranslation()
  const { data: me, isLoading } = useMe()
  if (isLoading) return <div className="mx-auto max-w-4xl px-4 py-16"><div className="h-40 animate-pulse rounded-3xl bg-navy-50" /></div>
  if (!me) return <Navigate to="/login" replace />

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">{me.roles.join(' · ').replaceAll('_', ' ')}</p>
      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Hello, {me.name.split(' ')[0]}</h1>
      {me.status === 'pending_guardian' && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-gold-500/40 bg-gold-100 p-5 text-navy-900"><Lock className="shrink-0 text-gold-600" />{t('account.pending')}</div>
      )}
      <div className="mt-10 grid gap-8">
        {me.roles.includes('learner') && me.status === 'active' && <RevisionToday />}
        {me.roles.includes('parent') && <ParentPanel />}
        {!me.roles.includes('learner') && !me.roles.includes('parent') && (
          <Notice>Your {me.roles.includes('teacher') ? 'teacher' : 'administration'} dashboard is being built (Phase 5). Your account and permissions are active.</Notice>
        )}
      </div>
    </div>
  )
}

function RevisionToday() {
  const { t } = useTranslation()
  const { data } = useQuery({ queryKey: ['revision'], queryFn: () => api<{ data: { topicId: number; topic: string; subject: string; lapses: number }[] }>('/me/revision') })
  return (
    <section className="rounded-3xl border border-navy-900/10 p-6">
      <h2 className="flex items-center gap-2 text-2xl font-semibold"><CalendarClock className="text-gold-600" />{t('account.revise')}</h2>
      {data && data.data.length === 0 && <p className="mt-4 text-muted">{t('account.nothingDue')}</p>}
      <ul className="mt-4 divide-y divide-navy-900/10">
        {data?.data.map((d) => (
          <li key={d.topicId} className="flex items-center justify-between py-3">
            <span><span className="font-semibold text-navy-900">{d.topic}</span><span className="ml-2 text-sm text-muted">{d.subject}</span></span>
            {d.lapses > 0 && <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800">needs work</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}

interface Child { id: number; name: string; status: string; level?: string; lessonsCompleted: number; recentResults: { assessment: string; percentage: number; passed: boolean }[]; weakTopics: { topic: string; averagePct: number }[] }

function ParentPanel() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const requests = useQuery({ queryKey: ['link-requests'], queryFn: () => api<{ data: { learnerId: number; name: string; username: string }[] }>('/parent/link-requests') })
  const children = useQuery({ queryKey: ['children'], queryFn: () => api<{ data: Child[] }>('/parent/children') })
  const decide = useMutation({
    mutationFn: ({ learnerId, decision }: { learnerId: number; decision: 'approve' | 'reject' }) =>
      api(`/parent/link-requests/${learnerId}`, { method: 'POST', body: JSON.stringify({ decision }) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['link-requests'] }); void qc.invalidateQueries({ queryKey: ['children'] }); void qc.invalidateQueries({ queryKey: ['me'] }) },
  })

  return (
    <>
      {!!requests.data?.data.length && (
        <section className="rounded-3xl border border-gold-500/40 bg-gold-100 p-6">
          <h2 className="text-xl font-semibold">{t('account.linkRequests')}</h2>
          <p className="mt-1 text-sm text-navy-800">Approving gives your consent for Elite Revision to process your child’s learning data.</p>
          <ul className="mt-4 grid gap-3">
            {requests.data.data.map((r) => (
              <li key={r.learnerId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4">
                <span className="font-semibold text-navy-900">{r.name} <span className="font-normal text-muted">@{r.username}</span></span>
                <span className="flex gap-2">
                  <Button variant="navy" onClick={() => decide.mutate({ learnerId: r.learnerId, decision: 'approve' })}><Check size={16} />{t('account.approve')}</Button>
                  <Button variant="outline" onClick={() => decide.mutate({ learnerId: r.learnerId, decision: 'reject' })}><X size={16} />{t('account.reject')}</Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h2 className="text-2xl font-semibold">{t('account.children')}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {children.data?.data.map((c) => (
            <article key={c.id} className="rounded-3xl border border-navy-900/10 p-6">
              <h3 className="font-sans text-lg font-bold">{c.name}</h3>
              <p className="text-sm text-muted">{c.level} · {c.lessonsCompleted} lessons completed</p>
              {c.recentResults.length > 0 && (
                <ul className="mt-4 space-y-1.5 text-sm">
                  {c.recentResults.map((r, i) => (
                    <li key={i} className="flex justify-between"><span>{r.assessment}</span><span className={`font-semibold ${r.passed ? 'text-emerald-700' : 'text-rose-700'}`}>{Math.round(r.percentage)}%</span></li>
                  ))}
                </ul>
              )}
              {c.weakTopics.length > 0 && <p className="mt-4 text-sm"><span className="font-semibold text-navy-900">Needs attention:</span> {c.weakTopics.map((w) => w.topic).join(', ')}</p>}
            </article>
          ))}
          {children.data?.data.length === 0 && <p className="text-muted">No linked children yet. Ask your child to enter your email when they register.</p>}
        </div>
      </section>
    </>
  )
}
