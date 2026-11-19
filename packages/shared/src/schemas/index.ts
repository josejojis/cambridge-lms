import { z } from 'zod'

// ── Common ──────────────────────────────────────────────────────────────────
export const ErrorResponse = z.object({ error: z.string(), issues: z.array(z.object({ path: z.string(), message: z.string() })).optional() })

// ── Auth / registration ─────────────────────────────────────────────────────
export const Username = z.string().trim().min(3).max(30).regex(/^[a-z0-9._]+$/i, 'Use letters, numbers, dots or underscores')
export const Password = z.string().min(10, 'Use at least 10 characters').max(128)

export const RegisterLearner = z.object({
  name: z.string().trim().min(2).max(100),
  username: Username,
  password: Password,
  birthYear: z.number().int().min(1950).max(new Date().getFullYear()),
  birthMonth: z.number().int().min(1).max(12),
  curriculum: z.enum(['cambridge', 'cbc']),
  levelCode: z.string().min(1).max(20),
  parentEmail: z.email().optional(),
  acceptTerms: z.literal(true),
})
export type RegisterLearner = z.infer<typeof RegisterLearner>

export const RegisterParent = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email(),
  password: Password,
  acceptTerms: z.literal(true),
})
export type RegisterParent = z.infer<typeof RegisterParent>

export const Me = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().nullable(),
  username: z.string().nullable(),
  status: z.enum(['active', 'pending_guardian', 'suspended', 'deactivated']),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  home: z.string(),
  twoFactorEnabled: z.boolean(),
})
export type Me = z.infer<typeof Me>

export const LinkDecision = z.object({ decision: z.enum(['approve', 'reject']) })

// ── Catalogue ───────────────────────────────────────────────────────────────
export const CatalogueResponse = z.object({
  data: z.array(z.object({
    code: z.string(), name: z.string(), labels: z.record(z.string(), z.string()),
    levels: z.array(z.object({ name: z.string(), code: z.string(), kind: z.string(), children: z.array(z.object({ name: z.string(), code: z.string() })) })),
    offerings: z.array(z.object({
      subject: z.string(), slug: z.string(), icon: z.string().nullable(), level: z.string(), levelCode: z.string(), units: z.number(),
      courses: z.array(z.object({ title: z.string(), slug: z.string(), summary: z.string().nullable(), lessons: z.number() })),
    })),
  })),
})
export type CatalogueResponse = z.infer<typeof CatalogueResponse>

export const Plan = z.object({
  slug: z.string(), name: z.string(), description: z.string().nullable(), priceMinor: z.number(), currency: z.string(),
  billingPeriod: z.enum(['free', 'monthly', 'termly', 'annual']), trialDays: z.number(), maxLearners: z.number(), features: z.array(z.string()),
})
export const PlansResponse = z.object({ data: z.array(Plan) })
export type Plan = z.infer<typeof Plan>

// ── Assessment answers (autosave + offline sync) ────────────────────────────
export const AnswerResponse = z.union([
  z.object({ optionId: z.number() }),
  z.object({ optionIds: z.array(z.number()) }),
  z.object({ value: z.boolean() }),
  z.object({ blanks: z.array(z.string().max(500)) }),
  z.object({ pairs: z.record(z.string(), z.string()) }),
  z.object({ text: z.string().max(20000) }),
])
export const SaveAnswers = z.object({
  answers: z.array(z.object({
    questionId: z.number(),
    response: AnswerResponse,
    clientSavedAt: z.iso.datetime(), // device time: informational only; the server's deadline is authoritative
  })).min(1).max(200),
})
export type SaveAnswers = z.infer<typeof SaveAnswers>

// ── Spaced repetition review ────────────────────────────────────────────────
export const ReviewGrade = z.object({ topicId: z.number(), rating: z.enum(['again', 'hard', 'good', 'easy']) })

// ── AI ──────────────────────────────────────────────────────────────────────
export const HintRequest = z.object({ questionId: z.number(), attemptId: z.string().optional() })
export const MarkingSuggestionRequest = z.object({ answerId: z.number() })
