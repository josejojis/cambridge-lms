import { describe, expect, it } from 'vitest'
import { markAnswer, totalAttempt } from './marking'

const opts = [{ id: 1, isCorrect: false }, { id: 2, isCorrect: true }, { id: 3, isCorrect: true }, { id: 4, isCorrect: false }]

describe('markAnswer', () => {
  it('mcq: full marks only for the correct option', () => {
    expect(markAnswer({ type: 'mcq', marks: 2, options: opts }, { optionId: 2 })).toEqual({ score: 2, requiresManual: false })
    expect(markAnswer({ type: 'mcq', marks: 2, options: opts }, { optionId: 1 }).score).toBe(0)
    expect(markAnswer({ type: 'mcq', marks: 2, options: opts }, null).score).toBe(0)
  })

  it('true_false compares booleans strictly', () => {
    const q = { type: 'true_false' as const, marks: 1, answerKey: { value: false } }
    expect(markAnswer(q, { value: false }).score).toBe(1)
    expect(markAnswer(q, { value: true }).score).toBe(0)
  })

  it('multi_select gives partial credit and penalises wrong picks', () => {
    const q = { type: 'multi_select' as const, marks: 4, options: opts }
    expect(markAnswer(q, { optionIds: [2, 3] }).score).toBe(4)
    expect(markAnswer(q, { optionIds: [2] }).score).toBe(2)
    expect(markAnswer(q, { optionIds: [2, 1] }).score).toBe(0)
    expect(markAnswer(q, { optionIds: [1, 4] }).score).toBe(0) // floored
  })

  it('fill_blank accepts variants, ignoring case and spacing', () => {
    const q = { type: 'fill_blank' as const, marks: 2, answerKey: { blanks: [['photosynthesis'], ['chlorophyll', 'chlorophyl']] } }
    expect(markAnswer(q, { blanks: ['  Photosynthesis ', 'CHLOROPHYL'] }).score).toBe(2)
    expect(markAnswer(q, { blanks: ['respiration', 'chlorophyll'] }).score).toBe(1)
  })

  it('matching gives a share per correct pair', () => {
    const q = { type: 'matching' as const, marks: 3, answerKey: { pairs: { a: 'x', b: 'y', c: 'z' } } }
    expect(markAnswer(q, { pairs: { a: 'x', b: 'z', c: 'z' } }).score).toBe(2)
  })

  it('short_answer auto-marks only when accepted answers exist', () => {
    expect(markAnswer({ type: 'short_answer', marks: 1, answerKey: { accepted: ['Nairobi'] } }, { text: 'nairobi' }).score).toBe(1)
    expect(markAnswer({ type: 'short_answer', marks: 1 }, { text: 'anything' })).toEqual({ score: null, requiresManual: true })
  })

  it('essay and long_answer always require manual marking', () => {
    expect(markAnswer({ type: 'essay', marks: 10 }, { text: '...' }).requiresManual).toBe(true)
    expect(markAnswer({ type: 'long_answer', marks: 6 }, { text: '...' }).requiresManual).toBe(true)
  })
})

describe('totalAttempt', () => {
  it('totals scores, computes percentage and pass', () => {
    expect(totalAttempt([{ score: 3, marks: 4 }, { score: 4, marks: 6 }], 50)).toEqual({ score: 7, maxScore: 10, percentage: 70, passed: true, pendingManual: false })
  })
  it('flags results that still need manual marking', () => {
    expect(totalAttempt([{ score: 1, marks: 1 }, { score: null, marks: 9 }], 50).pendingManual).toBe(true)
  })
})
