/**
 * Objective-question auto-marking. Pure functions: no DB access, fully unit-tested.
 * Written answers (long_answer, essay, and short_answer without an accepted list) return
 * `requiresManual: true` and are marked by a teacher.
 */

export type QuestionType =
  | 'mcq' | 'true_false' | 'fill_blank' | 'short_answer' | 'long_answer' | 'essay' | 'matching' | 'multi_select'

export interface MarkableOption { id: number; isCorrect: boolean }

export interface MarkableQuestion {
  type: QuestionType
  marks: number
  options?: MarkableOption[]
  answerKey?: unknown
}

export type Response =
  | { optionId: number }
  | { optionIds: number[] }
  | { value: boolean }
  | { blanks: string[] }
  | { pairs: Record<string, string> }
  | { text: string }
  | null
  | undefined

export interface MarkOutcome { score: number | null; requiresManual: boolean }

const norm = (s: unknown) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
const round2 = (n: number) => Math.round(n * 100) / 100
const manual: MarkOutcome = { score: null, requiresManual: true }
const auto = (score: number): MarkOutcome => ({ score: round2(score), requiresManual: false })

export function markAnswer(q: MarkableQuestion, response: Response): MarkOutcome {
  const key = (q.answerKey ?? {}) as Record<string, unknown>
  const r = (response ?? {}) as Record<string, unknown>

  switch (q.type) {
    case 'mcq': {
      const opt = q.options?.find((o) => o.id === r.optionId)
      return auto(opt?.isCorrect ? q.marks : 0)
    }
    case 'true_false':
      return auto(typeof r.value === 'boolean' && r.value === key.value ? q.marks : 0)

    case 'multi_select': {
      // Each correct pick earns a share; each wrong pick cancels one correct pick. Floor at 0.
      const correct = new Set((q.options ?? []).filter((o) => o.isCorrect).map((o) => o.id))
      if (correct.size === 0) return auto(0)
      const picked = new Set(Array.isArray(r.optionIds) ? (r.optionIds as number[]) : [])
      let right = 0, wrong = 0
      for (const id of picked) (correct.has(id) ? right++ : wrong++)
      return auto(Math.max(0, (right - wrong) / correct.size) * q.marks)
    }

    case 'fill_blank': {
      const accepted = (key.blanks as string[][] | undefined) ?? []
      if (accepted.length === 0) return manual
      const given = Array.isArray(r.blanks) ? (r.blanks as string[]) : []
      const hits = accepted.filter((variants, i) => variants.some((v) => norm(v) === norm(given[i]))).length
      return auto((hits / accepted.length) * q.marks)
    }

    case 'matching': {
      const pairs = (key.pairs as Record<string, string> | undefined) ?? {}
      const lefts = Object.keys(pairs)
      if (lefts.length === 0) return manual
      const given = (r.pairs ?? {}) as Record<string, string>
      const hits = lefts.filter((l) => norm(given[l]) === norm(pairs[l])).length
      return auto((hits / lefts.length) * q.marks)
    }

    case 'short_answer': {
      const accepted = key.accepted as string[] | undefined
      if (!accepted?.length) return manual
      return auto(accepted.some((a) => norm(a) === norm(r.text)) ? q.marks : 0)
    }

    case 'long_answer':
    case 'essay':
      return manual
  }
}

/** Totals an attempt. `null` scores (awaiting manual marking) make the result provisional. */
export function totalAttempt(items: { score: number | null; marks: number }[], passMarkPct: number) {
  const maxScore = items.reduce((s, i) => s + i.marks, 0)
  const pendingManual = items.some((i) => i.score === null)
  const score = round2(items.reduce((s, i) => s + (i.score ?? 0), 0))
  const percentage = maxScore === 0 ? 0 : round2((score / maxScore) * 100)
  return { score, maxScore, percentage, passed: percentage >= passMarkPct, pendingManual }
}
