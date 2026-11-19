/**
 * Reference curriculum STRUCTURE (stage, grade and subject names) loaded by the production seed.
 * These are public organisational names only, with no syllabus text or examination content.
 * Administrators can edit everything after seeding.
 */

export type LevelKind = 'stage' | 'qualification' | 'grade' | 'year'
export interface LevelSpec { name: string; code: string; kind: LevelKind; children?: LevelSpec[] }
export interface CurriculumSpec {
  code: 'cambridge' | 'cbc'
  name: string
  labels: Record<'level' | 'subject' | 'unit' | 'topic' | 'objective', string>
  levels: LevelSpec[]
  /** Subject offerings: level code → subject names */
  offerings: Record<string, string[]>
}

const years = (from: number, to: number): LevelSpec[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ name: `Year ${from + i}`, code: `Y${from + i}`, kind: 'year' as const }))
const grades = (from: number, to: number): LevelSpec[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ name: `Grade ${from + i}`, code: `G${from + i}`, kind: 'grade' as const }))

export const SUBJECTS: { name: string; icon: string }[] = [
  { name: 'Mathematics', icon: 'Sigma' }, { name: 'English', icon: 'BookOpen' }, { name: 'Science', icon: 'FlaskRound' },
  { name: 'Biology', icon: 'Leaf' }, { name: 'Chemistry', icon: 'FlaskConical' }, { name: 'Physics', icon: 'Atom' },
  { name: 'Computer Science', icon: 'Cpu' }, { name: 'Computing', icon: 'Laptop' }, { name: 'Global Perspectives', icon: 'Globe2' },
  { name: 'Geography', icon: 'Map' }, { name: 'History', icon: 'Landmark' }, { name: 'Business Studies', icon: 'Briefcase' },
  { name: 'Economics', icon: 'TrendingUp' }, { name: 'Accounting', icon: 'Calculator' }, { name: 'French', icon: 'Languages' },
  { name: 'Further Mathematics', icon: 'Sigma' }, { name: 'Psychology', icon: 'Brain' }, { name: 'Sociology', icon: 'Users' },
  { name: 'Literature in English', icon: 'BookMarked' },
  // CBC learning areas
  { name: 'Kiswahili', icon: 'Languages' }, { name: 'Literacy', icon: 'BookA' }, { name: 'Mathematical Activities', icon: 'Shapes' },
  { name: 'Environmental Activities', icon: 'Trees' }, { name: 'Creative Activities', icon: 'Palette' },
  { name: 'Religious Education', icon: 'BookHeart' }, { name: 'Science and Technology', icon: 'Microscope' },
  { name: 'Agriculture and Nutrition', icon: 'Sprout' }, { name: 'Social Studies', icon: 'Globe' },
  { name: 'Creative Arts', icon: 'Palette' }, { name: 'Integrated Science', icon: 'Microscope' },
  { name: 'Pre-Technical Studies', icon: 'Wrench' }, { name: 'Health Education', icon: 'HeartPulse' },
  { name: 'Agriculture', icon: 'Sprout' }, { name: 'Life Skills Education', icon: 'Sparkles' },
  { name: 'Community Service Learning', icon: 'HandHeart' }, { name: 'Physical Education', icon: 'Dumbbell' },
]

const CAM_PRIMARY = ['Mathematics', 'English', 'Science', 'Computing', 'Global Perspectives']
const CAM_LOWER_SEC = ['Mathematics', 'English', 'Science', 'Computing', 'Global Perspectives']
const CAM_IGCSE = ['Mathematics', 'English', 'Biology', 'Chemistry', 'Physics', 'Computer Science', 'Geography', 'History', 'Business Studies', 'Economics', 'Accounting', 'French', 'Literature in English']
const CAM_A = ['Mathematics', 'Further Mathematics', 'Biology', 'Chemistry', 'Physics', 'Computer Science', 'Economics', 'Business Studies', 'Accounting', 'Psychology', 'Sociology', 'History', 'Geography']

const CBC_PP = ['Literacy', 'Mathematical Activities', 'Environmental Activities', 'Creative Activities', 'Religious Education']
const CBC_LP = ['Literacy', 'Kiswahili', 'English', 'Mathematics', 'Environmental Activities', 'Creative Activities', 'Religious Education']
const CBC_UP = ['English', 'Kiswahili', 'Mathematics', 'Science and Technology', 'Agriculture and Nutrition', 'Social Studies', 'Creative Arts', 'Religious Education']
const CBC_JS = ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Pre-Technical Studies', 'Social Studies', 'Agriculture', 'Creative Arts', 'Religious Education', 'Health Education']
const CBC_SS = ['English', 'Kiswahili', 'Mathematics', 'Community Service Learning', 'Physical Education', 'Biology', 'Chemistry', 'Physics', 'Computer Science', 'Geography', 'History', 'Business Studies']

const fill = (codes: string[], subjects: string[]) => Object.fromEntries(codes.map((c) => [c, subjects]))

export const CURRICULA: CurriculumSpec[] = [
  {
    code: 'cambridge', name: 'Cambridge International',
    labels: { level: 'Stage', subject: 'Subject', unit: 'Unit', topic: 'Topic', objective: 'Learning objective' },
    levels: [
      { name: 'Key Stage 1', code: 'KS1', kind: 'stage', children: years(1, 2) },
      { name: 'Key Stage 2', code: 'KS2', kind: 'stage', children: years(3, 6) },
      { name: 'Key Stage 3', code: 'KS3', kind: 'stage', children: years(7, 9) },
      { name: 'Key Stage 4', code: 'KS4', kind: 'stage', children: years(10, 11) },
      { name: 'Key Stage 5', code: 'KS5', kind: 'stage', children: years(12, 13) },
      { name: 'IGCSE', code: 'IGCSE', kind: 'qualification' },
      { name: 'AS Level', code: 'AS', kind: 'qualification' },
      { name: 'A Level', code: 'AL', kind: 'qualification' },
    ],
    offerings: {
      ...fill(['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6'], CAM_PRIMARY),
      ...fill(['Y7', 'Y8', 'Y9'], CAM_LOWER_SEC),
      IGCSE: CAM_IGCSE, AS: CAM_A, AL: CAM_A,
    },
  },
  {
    code: 'cbc', name: 'Kenya Competency-Based Curriculum',
    labels: { level: 'Grade', subject: 'Learning area', unit: 'Strand', topic: 'Sub-strand', objective: 'Learning outcome' },
    levels: [
      { name: 'Pre-Primary', code: 'PP', kind: 'stage', children: [{ name: 'PP1', code: 'PP1', kind: 'grade' }, { name: 'PP2', code: 'PP2', kind: 'grade' }] },
      { name: 'Lower Primary', code: 'LP', kind: 'stage', children: grades(1, 3) },
      { name: 'Upper Primary', code: 'UP', kind: 'stage', children: grades(4, 6) },
      { name: 'Junior School', code: 'JS', kind: 'stage', children: grades(7, 9) },
      { name: 'Senior School', code: 'SS', kind: 'stage', children: grades(10, 12) },
    ],
    offerings: {
      ...fill(['PP1', 'PP2'], CBC_PP), ...fill(['G1', 'G2', 'G3'], CBC_LP), ...fill(['G4', 'G5', 'G6'], CBC_UP),
      ...fill(['G7', 'G8', 'G9'], CBC_JS), ...fill(['G10', 'G11', 'G12'], CBC_SS),
    },
  },
]

/** Default platform settings (production seed inserts only keys that don't exist yet). */
export const DEFAULT_SETTINGS: { key: string; value: unknown; isPublic: boolean }[] = [
  { key: 'platform.name', value: 'Elite Revision', isPublic: true },
  { key: 'platform.tagline', value: 'Learn. Practise. Prepare. Succeed.', isPublic: true },
  { key: 'platform.support_email', value: 'support@elite-revision.com', isPublic: true },
  { key: 'platform.domain', value: 'elite-revision.com', isPublic: true },
  { key: 'billing.default_currency', value: 'KES', isPublic: true },
  { key: 'billing.termly_period_days', value: 120, isPublic: false },
  { key: 'billing.grace_period_days', value: 3, isPublic: false },
  { key: 'content.require_approval', value: true, isPublic: false },
  { key: 'privacy.guardian_consent_age', value: 18, isPublic: false },
  { key: 'privacy.policy_version', value: '2026-11', isPublic: true },
  { key: 'privacy.terms_version', value: '2026-11', isPublic: true },
  { key: 'assessment.autosubmit_grace_seconds', value: 30, isPublic: false },
  { key: 'features.certificates', value: true, isPublic: true },
  { key: 'features.ai_hints', value: false, isPublic: true },
  { key: 'features.ai_marking_suggestions', value: false, isPublic: false },
  { key: 'i18n.locales', value: ['en', 'sw'], isPublic: true },
]

/** Plan templates: seeded INACTIVE with price 0 so nothing is sold before an admin sets real prices. */
export const PLAN_TEMPLATES = [
  { slug: 'free', name: 'Free', billingPeriod: 'free', periodDays: 3650, maxLearners: 1, isActive: true, features: ['Sample lessons', 'Limited practice questions', 'Progress tracking'] },
  { slug: 'basic', name: 'Basic', billingPeriod: 'monthly', periodDays: 30, maxLearners: 1, isActive: false, features: ['Full lessons for chosen subjects', 'Unlimited practice', 'Topic quizzes'] },
  { slug: 'premium', name: 'Premium', billingPeriod: 'termly', periodDays: 120, maxLearners: 3, isActive: false, features: ['All subjects', 'Mock examinations', 'Teacher marking', 'Parent reports'] },
  { slug: 'exam-prep', name: 'Exam Preparation', billingPeriod: 'annual', periodDays: 365, maxLearners: 1, isActive: false, features: ['Mock exam series', 'Revision plans', 'Priority marking'] },
] as const
