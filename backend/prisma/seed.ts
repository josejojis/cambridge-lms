/**
 * DEMO / TEST DATA SEEDER: development only.
 *
 * - Refuses to run when NODE_ENV=production.
 * - Every account uses the reserved `.test` domain and has is_test_data = true.
 * - Learning content is ORIGINAL sample material written for Elite Revision demos. It is not taken
 *   from Cambridge or KICD materials. Curriculum *structure* (stage, grade and subject names) is public.
 * - Assessment results are produced by running the real marking engine over seeded answers,
 *   so every score is consistent with the answers stored for that attempt.
 * - Payments are labelled sandbox test transactions; no real money or provider was involved.
 */
import 'dotenv/config'
import { createDb } from '../src/lib/db'
import { hashPassword } from '../src/lib/password'
import { markAnswer, totalAttempt, type QuestionType, type Response } from '../src/modules/assessment/marking'

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed demo data in production.')
  process.exit(1)
}

const db = createDb()
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'ChangeMe!2026'
const days = (n: number) => new Date(Date.now() + n * 86_400_000)

// ── Roles & permissions ─────────────────────────────────────────────────────
const PERMISSIONS: Record<string, string[]> = {
  users: ['users.view', 'users.manage', 'roles.manage'],
  curriculum: ['curriculum.view', 'curriculum.manage'],
  content: ['content.view', 'content.create', 'content.publish', 'resources.upload'],
  assessment: ['questions.manage', 'assessments.manage', 'assessments.take', 'attempts.mark', 'results.release', 'results.view_own'],
  classroom: ['classes.manage', 'classes.view_assigned'],
  reporting: ['reports.platform', 'reports.class', 'reports.child'],
  billing: ['plans.manage', 'payments.view', 'payments.reconcile', 'subscriptions.manage_own'],
  communication: ['announcements.manage', 'notifications.send', 'support.manage', 'support.create'],
  platform: ['settings.manage', 'audit.view'],
}
const ALL = Object.values(PERMISSIONS).flat()
const ROLES: { slug: string; name: string; description: string; perms: string[] }[] = [
  { slug: 'super_admin', name: 'Main Administrator', description: 'Full platform access', perms: ALL },
  { slug: 'content_editor', name: 'Content Editor', description: 'Creates and maintains learning content and questions',
    perms: ['curriculum.view', 'content.view', 'content.create', 'resources.upload', 'questions.manage', 'assessments.manage', 'support.create'] },
  { slug: 'teacher', name: 'Teacher', description: 'Teaches assigned classes and marks work',
    perms: ['curriculum.view', 'content.view', 'classes.view_assigned', 'assessments.manage', 'attempts.mark', 'results.release', 'reports.class', 'support.create'] },
  { slug: 'parent', name: 'Parent', description: 'Monitors linked children and manages subscriptions',
    perms: ['reports.child', 'subscriptions.manage_own', 'support.create'] },
  { slug: 'learner', name: 'Learner', description: 'Studies, practises and sits assessments',
    perms: ['curriculum.view', 'content.view', 'assessments.take', 'results.view_own', 'support.create'] },
]

async function wipe() {
  // Child tables first. Dev-only.
  const order = [
    'auditLog', 'systemSetting', 'certificate', 'progressReport', 'supportTicketMessage', 'supportTicket', 'announcement', 'notification',
    'invoice', 'paymentCallback', 'payment', 'subscriptionLearner', 'subscription', 'planEntitlement', 'subscriptionPlan',
    'topicPerformance', 'assessmentResult', 'learnerAnswer', 'assessmentAttempt', 'assessmentQuestion', 'assessment',
    'markingScheme', 'questionOption', 'question', 'questionBank',
    'teacherAssignment', 'classLearner', 'schoolClass',
    'bookmark', 'lessonProgress', 'enrollment', 'learningResource', 'lessonSection', 'lesson', 'course',
    'learningObjective', 'topic', 'unit', 'curriculumSubject', 'subject', 'learnerProfile', 'academicLevel', 'curriculum',
    'consent', 'parentLearnerLink', 'parentProfile', 'teacherProfile', 'userRole', 'rolePermission', 'permission', 'role', 'user',
  ] as const
  for (const m of order) await (db as any)[m].deleteMany()
}

async function main() {
  console.log('Seeding Elite Revision DEMO data…')
  await wipe()

  // Permissions & roles
  for (const [module, slugs] of Object.entries(PERMISSIONS))
    for (const slug of slugs) await db.permission.create({ data: { slug, module } })
  const perms = Object.fromEntries((await db.permission.findMany()).map((p) => [p.slug, p.id]))
  const roles: Record<string, number> = {}
  for (const r of ROLES) {
    const role = await db.role.create({
      data: { slug: r.slug, name: r.name, description: r.description, permissions: { create: r.perms.map((p) => ({ permissionId: perms[p] })) } },
    })
    roles[r.slug] = role.id
  }

  // ── Curricula & level trees ───────────────────────────────────────────────
  const cambridge = await db.curriculum.create({ data: { code: 'cambridge', name: 'Cambridge International',
    labels: { level: 'Stage', subject: 'Subject', unit: 'Unit', topic: 'Topic', objective: 'Learning objective' } } })
  const cbc = await db.curriculum.create({ data: { code: 'cbc', name: 'Kenya Competency-Based Curriculum',
    labels: { level: 'Grade', subject: 'Learning area', unit: 'Strand', topic: 'Sub-strand', objective: 'Learning outcome' } } })

  const level = async (curriculumId: number, kind: 'stage' | 'qualification' | 'grade' | 'year', name: string, code: string, sortOrder: number, parentId?: number) =>
    db.academicLevel.create({ data: { curriculumId, kind, name, code, sortOrder, parentId } })

  const L: Record<string, number> = {}
  const camStages: [string, string, [string, string][]][] = [
    ['Key Stage 1', 'KS1', [['Year 1', 'Y1'], ['Year 2', 'Y2']]],
    ['Key Stage 2', 'KS2', [['Year 3', 'Y3'], ['Year 4', 'Y4'], ['Year 5', 'Y5'], ['Year 6', 'Y6']]],
    ['Key Stage 3', 'KS3', [['Year 7', 'Y7'], ['Year 8', 'Y8'], ['Year 9', 'Y9']]],
    ['Key Stage 4', 'KS4', [['Year 10', 'Y10'], ['Year 11', 'Y11']]],
    ['Key Stage 5', 'KS5', [['Year 12', 'Y12'], ['Year 13', 'Y13']]],
  ]
  let i = 0
  for (const [name, code, years] of camStages) {
    const s = await level(cambridge.id, 'stage', name, code, i++)
    L[code] = s.id
    let j = 0
    for (const [yn, yc] of years) L[yc] = (await level(cambridge.id, 'year', yn, yc, j++, s.id)).id
  }
  for (const [name, code] of [['IGCSE', 'IGCSE'], ['AS Level', 'AS'], ['A Level', 'AL']] as const)
    L[code] = (await level(cambridge.id, 'qualification', name, code, i++)).id

  const cbcStages: [string, string, [string, string][]][] = [
    ['Pre-Primary', 'PP', [['PP1', 'PP1'], ['PP2', 'PP2']]],
    ['Lower Primary', 'LP', [['Grade 1', 'G1'], ['Grade 2', 'G2'], ['Grade 3', 'G3']]],
    ['Upper Primary', 'UP', [['Grade 4', 'G4'], ['Grade 5', 'G5'], ['Grade 6', 'G6']]],
    ['Junior School', 'JS', [['Grade 7', 'G7'], ['Grade 8', 'G8'], ['Grade 9', 'G9']]],
    ['Senior School', 'SS', [['Grade 10', 'G10'], ['Grade 11', 'G11'], ['Grade 12', 'G12']]],
  ]
  i = 0
  for (const [name, code, grades] of cbcStages) {
    const s = await level(cbc.id, 'stage', name, code, i++)
    L[`CBC_${code}`] = s.id
    let j = 0
    for (const [gn, gc] of grades) L[`CBC_${gc}`] = (await level(cbc.id, 'grade', gn, gc, j++, s.id)).id
  }

  // ── Subjects & offerings ──────────────────────────────────────────────────
  const subjectNames: [string, string][] = [
    ['Mathematics', 'Sigma'], ['English', 'BookOpen'], ['Biology', 'Leaf'], ['Chemistry', 'FlaskConical'], ['Physics', 'Atom'],
    ['Computer Science', 'Cpu'], ['Integrated Science', 'Microscope'], ['Kiswahili', 'Languages'], ['Social Studies', 'Globe'],
  ]
  const S: Record<string, number> = {}
  for (const [name, icon] of subjectNames)
    S[name] = (await db.subject.create({ data: { name, slug: name.toLowerCase().replace(/\s+/g, '-'), icon } })).id

  const offer = (curriculumId: number, levelKey: string, subject: string) =>
    db.curriculumSubject.create({ data: { curriculumId, levelId: L[levelKey], subjectId: S[subject] } })

  const igMath = await offer(cambridge.id, 'IGCSE', 'Mathematics')
  const igBio = await offer(cambridge.id, 'IGCSE', 'Biology')
  await offer(cambridge.id, 'IGCSE', 'Chemistry')
  await offer(cambridge.id, 'IGCSE', 'Physics')
  await offer(cambridge.id, 'IGCSE', 'Computer Science')
  await offer(cambridge.id, 'AS', 'Mathematics')
  await offer(cambridge.id, 'AL', 'Mathematics')
  const ks3Eng = await offer(cambridge.id, 'Y8', 'English')
  const g7Math = await offer(cbc.id, 'CBC_G7', 'Mathematics')
  const g7Sci = await offer(cbc.id, 'CBC_G7', 'Integrated Science')
  await offer(cbc.id, 'CBC_G7', 'Kiswahili')
  await offer(cbc.id, 'CBC_G7', 'Social Studies')
  await offer(cbc.id, 'CBC_G4', 'Mathematics')

  // ── Units → topics → objectives (original demo wording) ───────────────────
  type TopicSpec = { title: string; objectives: string[] }
  const buildUnits = async (csId: number, units: { title: string; topics: TopicSpec[] }[]) => {
    const topics: Record<string, number> = {}
    for (const [ui, u] of units.entries()) {
      const unit = await db.unit.create({ data: { curriculumSubjectId: csId, title: u.title, code: `U${ui + 1}`, sortOrder: ui } })
      for (const [ti, t] of u.topics.entries()) {
        const topic = await db.topic.create({ data: { unitId: unit.id, title: t.title, sortOrder: ti, description: `Demo topic: ${t.title}.` } })
        topics[t.title] = topic.id
        for (const [oi, statement] of t.objectives.entries())
          await db.learningObjective.create({ data: { topicId: topic.id, code: `${ui + 1}.${ti + 1}.${oi + 1}`, statement, sortOrder: oi } })
      }
    }
    return topics
  }

  const T = {
    ...(await buildUnits(igMath.id, [
      { title: 'Algebra', topics: [
        { title: 'Linear equations', objectives: ['Solve equations with the unknown on one side', 'Solve equations with brackets and unknowns on both sides'] },
        { title: 'Quadratic expressions', objectives: ['Expand a pair of brackets', 'Factorise simple quadratics'] },
      ] },
      { title: 'Number', topics: [
        { title: 'Fractions and percentages', objectives: ['Convert between fractions, decimals and percentages', 'Find a percentage of a quantity'] },
      ] },
    ])),
    ...(await buildUnits(igBio.id, [
      { title: 'Plant nutrition', topics: [
        { title: 'Photosynthesis', objectives: ['State the word equation for photosynthesis', 'Explain how light intensity affects the rate'] },
      ] },
      { title: 'Cells', topics: [
        { title: 'Cell structure', objectives: ['Identify organelles in plant and animal cells', 'Describe the function of each organelle'] },
      ] },
    ])),
    ...(await buildUnits(ks3Eng.id, [
      { title: 'Writing', topics: [{ title: 'Persuasive writing', objectives: ['Use rhetorical techniques to persuade a reader'] }] },
    ])),
    ...(await buildUnits(g7Math.id, [
      { title: 'Numbers', topics: [
        { title: 'Whole numbers', objectives: ['Read and write numbers up to millions', 'Apply place value in real-life contexts'] },
        { title: 'Fractions', objectives: ['Add and subtract fractions with different denominators'] },
      ] },
      { title: 'Measurement', topics: [{ title: 'Area', objectives: ['Work out the area of rectangles and triangles'] }] },
    ])),
    ...(await buildUnits(g7Sci.id, [
      { title: 'Mixtures, elements and compounds', topics: [
        { title: 'Separating mixtures', objectives: ['Choose a suitable method to separate a given mixture'] },
      ] },
      { title: 'Living things', topics: [{ title: 'The human digestive system', objectives: ['Name the parts of the digestive system and their roles'] }] },
    ])),
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  const pw = await hashPassword(DEMO_PASSWORD)
  const mkUser = async (name: string, handle: string, role: string, opts: { status?: 'active' | 'pending_guardian'; email?: boolean } = {}) =>
    db.user.create({
      data: {
        name, username: handle, email: opts.email === false ? null : `${handle}@elite-revision.test`, passwordHash: pw,
        status: opts.status ?? 'active', emailVerifiedAt: opts.email === false ? null : new Date(), isTestData: true,
        roles: { create: { roleId: roles[role] } },
      },
    })

  const admin = await mkUser('Demo Administrator', 'admin', 'super_admin')
  const editor = await mkUser('Demo Content Editor', 'editor', 'content_editor')
  const tAchieng = await mkUser('Demo Teacher Achieng Otieno', 'teacher.achieng', 'teacher')
  const tDavid = await mkUser('Demo Teacher David Kimani', 'teacher.david', 'teacher')
  for (const t of [tAchieng, tDavid]) await db.teacherProfile.create({ data: { userId: t.id, bio: 'Demo teacher profile.', qualifications: 'B.Ed (demo)' } })

  const pWanjiru = await mkUser('Demo Parent Grace Wanjiru', 'parent.grace', 'parent')
  const pOmondi = await mkUser('Demo Parent Peter Omondi', 'parent.peter', 'parent')
  const pSharma = await mkUser('Demo Parent Priya Sharma', 'parent.priya', 'parent')
  for (const p of [pWanjiru, pOmondi, pSharma]) await db.parentProfile.create({ data: { userId: p.id, phone: '+254700000000', notificationPrefs: { email: true, sms: false } } })

  const learner = async (name: string, handle: string, curriculumId: number, levelKey: string, birthYear: number, status: 'active' | 'pending_guardian' = 'active') => {
    const u = await mkUser(name, handle, 'learner', { status, email: false })
    await db.learnerProfile.create({ data: { userId: u.id, curriculumId, levelId: L[levelKey], birthYear, birthMonth: 3, schoolName: 'Demo Academy' } })
    return u
  }
  const amani = await learner('Demo Learner Amani Wanjiru', 'amani', cbc.id, 'CBC_G7', 2013)
  const neema = await learner('Demo Learner Neema Wanjiru', 'neema', cbc.id, 'CBC_G4', 2016)
  const brian = await learner('Demo Learner Brian Omondi', 'brian', cambridge.id, 'IGCSE', 2010)
  const aisha = await learner('Demo Learner Aisha Sharma', 'aisha', cambridge.id, 'IGCSE', 2010)
  const kevin = await learner('Demo Learner Kevin Mutua', 'kevin', cbc.id, 'CBC_G7', 2013)
  const zuri = await learner('Demo Learner Zuri Otieno (awaiting parent)', 'zuri', cbc.id, 'CBC_G7', 2014, 'pending_guardian')

  // Parent links + consent (Kenya DPA: guardian consent for minors)
  const link = async (parent: { id: number }, child: { id: number }, status: 'active' | 'pending') => {
    await db.parentLearnerLink.create({ data: { parentId: parent.id, learnerId: child.id, status, verifiedAt: status === 'active' ? new Date() : null } })
    if (status === 'active') await db.consent.create({ data: { userId: parent.id, subjectUserId: child.id, type: 'guardian_data_processing', version: '2026-11' } })
  }
  await link(pWanjiru, amani, 'active')
  await link(pWanjiru, neema, 'active')
  await link(pOmondi, brian, 'active')
  await link(pSharma, aisha, 'active')
  await link(pOmondi, zuri, 'pending') // shows the approval workflow
  for (const u of [admin, editor, tAchieng, tDavid, pWanjiru, pOmondi, pSharma])
    for (const type of ['terms', 'privacy']) await db.consent.create({ data: { userId: u.id, type, version: '2026-11' } })

  // ── Classes & teacher assignments ─────────────────────────────────────────
  const g7Class = await db.schoolClass.create({ data: { name: 'Grade 7 Blue (demo)', curriculumId: cbc.id, levelId: L.CBC_G7, academicYear: '2026', schoolName: 'Demo Academy' } })
  const igClass = await db.schoolClass.create({ data: { name: 'IGCSE Year 10 (demo)', curriculumId: cambridge.id, levelId: L.IGCSE, academicYear: '2026/27', schoolName: 'Demo Academy' } })
  for (const l of [amani, kevin, zuri]) await db.classLearner.create({ data: { classId: g7Class.id, learnerId: l.id } })
  for (const l of [brian, aisha]) await db.classLearner.create({ data: { classId: igClass.id, learnerId: l.id } })
  await db.teacherAssignment.create({ data: { teacherId: tAchieng.id, classId: g7Class.id, curriculumSubjectId: g7Math.id } })
  await db.teacherAssignment.create({ data: { teacherId: tAchieng.id, classId: g7Class.id, curriculumSubjectId: g7Sci.id } })
  await db.teacherAssignment.create({ data: { teacherId: tDavid.id, classId: igClass.id, curriculumSubjectId: igMath.id } })
  await db.teacherAssignment.create({ data: { teacherId: tDavid.id, classId: igClass.id, curriculumSubjectId: igBio.id } })

  // ── Courses, lessons, sections, resources ─────────────────────────────────
  const course = async (csId: number, title: string, slug: string, lessons: { title: string; topic: string; sections: [string, string, string][] }[]) => {
    const c = await db.course.create({ data: { curriculumSubjectId: csId, authorId: editor.id, title, slug, summary: `Demo course: ${title}.`, status: 'published', publishedAt: new Date() } })
    const ids: number[] = []
    for (const [li, l] of lessons.entries()) {
      const lesson = await db.lesson.create({ data: { courseId: c.id, topicId: T[l.topic], title: l.title, sortOrder: li, estimatedMinutes: 20, status: 'published' } })
      ids.push(lesson.id)
      for (const [si, [type, title, body]] of l.sections.entries())
        await db.lessonSection.create({ data: { lessonId: lesson.id, type: type as any, title, bodyHtml: body, sortOrder: si } })
      await db.learningResource.create({ data: { lessonId: lesson.id, title: `${l.title}: revision sheet (demo placeholder)`, filePath: `demo/${slug}-${li + 1}.pdf`, mimeType: 'application/pdf', sizeBytes: 0 } })
    }
    return { course: c, lessonIds: ids }
  }

  const cIgMath = await course(igMath.id, 'IGCSE Mathematics: Algebra Foundations', 'igcse-maths-algebra', [
    { title: 'Solving linear equations', topic: 'Linear equations', sections: [
      ['notes', 'The balance method', '<p>An equation is like a balance: whatever you do to one side, you must do to the other. To solve <em>3x + 5 = 17</em>, subtract 5 from both sides, then divide both sides by 3.</p>'],
      ['worked_example', 'Worked example', '<p>Solve 2(x − 4) = 10.</p><ol><li>Expand: 2x − 8 = 10</li><li>Add 8: 2x = 18</li><li>Divide by 2: x = 9</li></ol>'],
      ['revision', 'Quick recap', '<ul><li>Undo operations in reverse order.</li><li>Check your answer by substituting it back.</li></ul>'],
    ] },
    { title: 'Expanding and factorising quadratics', topic: 'Quadratic expressions', sections: [
      ['notes', 'Expanding double brackets', '<p>Multiply every term in the first bracket by every term in the second: (x + 2)(x + 3) = x² + 5x + 6.</p>'],
      ['worked_example', 'Factorising', '<p>To factorise x² + 7x + 12, find two numbers that multiply to 12 and add to 7: 3 and 4. So x² + 7x + 12 = (x + 3)(x + 4).</p>'],
    ] },
  ])
  const cIgBio = await course(igBio.id, 'IGCSE Biology: Plants and Cells', 'igcse-biology-plants-cells', [
    { title: 'How plants make food', topic: 'Photosynthesis', sections: [
      ['notes', 'Photosynthesis', '<p>Plants use light energy, absorbed by chlorophyll, to turn carbon dioxide and water into glucose and oxygen.</p>'],
      ['diagram', 'Limiting factors', '<p>The rate rises with light intensity until another factor, such as carbon dioxide concentration or temperature, becomes limiting.</p>'],
    ] },
    { title: 'Inside a cell', topic: 'Cell structure', sections: [
      ['notes', 'Organelles', '<p>Both plant and animal cells have a nucleus, cytoplasm, cell membrane and mitochondria. Plant cells also have a cell wall, chloroplasts and a permanent vacuole.</p>'],
    ] },
  ])
  const cG7Math = await course(g7Math.id, 'Grade 7 Mathematics: Numbers', 'cbc-g7-maths-numbers', [
    { title: 'Place value to millions', topic: 'Whole numbers', sections: [
      ['notes', 'Reading large numbers', '<p>Group digits in threes from the right. 4 520 316 is read as “four million, five hundred and twenty thousand, three hundred and sixteen”.</p>'],
      ['worked_example', 'In real life', '<p>A county has 1 208 450 residents. The digit 2 is in the hundred-thousands place, so it stands for 200 000.</p>'],
    ] },
    { title: 'Adding fractions', topic: 'Fractions', sections: [
      ['notes', 'Common denominators', '<p>To add ½ and ⅓, rewrite both with denominator 6: 3/6 + 2/6 = 5/6.</p>'],
    ] },
  ])
  const cG7Sci = await course(g7Sci.id, 'Grade 7 Integrated Science: Mixtures', 'cbc-g7-science-mixtures', [
    { title: 'Separating mixtures', topic: 'Separating mixtures', sections: [
      ['notes', 'Methods', '<p>Filtration separates an insoluble solid from a liquid. Evaporation recovers a dissolved solid. Decanting pours off a liquid, leaving the sediment behind.</p>'],
    ] },
  ])

  // Enrolments + progress (demo)
  const enrol = (learnerId: number, courseId: number, source = 'subscription') => db.enrollment.create({ data: { learnerId, courseId, source } })
  for (const l of [brian, aisha]) { await enrol(l.id, cIgMath.course.id); await enrol(l.id, cIgBio.course.id) }
  for (const l of [amani, kevin]) { await enrol(l.id, cG7Math.course.id); await enrol(l.id, cG7Sci.course.id) }
  await enrol(neema.id, cG7Math.course.id, 'free')

  const progress = async (learnerId: number, lessonId: number, completed: boolean, minutes: number) => {
    const firstSection = await db.lessonSection.findFirst({ where: { lessonId }, orderBy: { sortOrder: 'desc' } })
    await db.lessonProgress.create({ data: {
      learnerId, lessonId, status: completed ? 'completed' : 'started', lastSectionId: firstSection?.id,
      secondsSpent: minutes * 60, startedAt: days(-10), completedAt: completed ? days(-9) : null,
    } })
  }
  await progress(brian.id, cIgMath.lessonIds[0], true, 24)
  await progress(brian.id, cIgMath.lessonIds[1], false, 8)
  await progress(aisha.id, cIgMath.lessonIds[0], true, 18)
  await progress(aisha.id, cIgMath.lessonIds[1], true, 26)
  await progress(aisha.id, cIgBio.lessonIds[0], true, 22)
  await progress(amani.id, cG7Math.lessonIds[0], true, 21)
  await progress(amani.id, cG7Math.lessonIds[1], false, 6)
  await progress(kevin.id, cG7Sci.lessonIds[0], true, 15)
  await db.bookmark.create({ data: { learnerId: brian.id, lessonId: cIgMath.lessonIds[1] } })
  await db.bookmark.create({ data: { learnerId: amani.id, lessonId: cG7Math.lessonIds[1] } })

  // ── Question banks: every question type ───────────────────────────────────
  type QSpec = {
    type: QuestionType; topic: string; stem: string; marks: number; difficulty?: 'easy' | 'medium' | 'hard'
    options?: [string, boolean][]; answerKey?: unknown; explanation?: string; scheme?: { point: string; marks: number }[]
  }
  const bank = async (csId: number, name: string, specs: QSpec[]) => {
    const b = await db.questionBank.create({ data: { curriculumSubjectId: csId, name, ownerId: editor.id } })
    const qs = []
    for (const s of specs) {
      const q = await db.question.create({
        data: {
          questionBankId: b.id, topicId: T[s.topic], authorId: editor.id, type: s.type, stemHtml: s.stem, marks: s.marks,
          difficulty: s.difficulty ?? 'medium', explanationHtml: s.explanation, answerKey: (s.answerKey ?? undefined) as any,
          options: s.options ? { create: s.options.map(([labelHtml, isCorrect], sortOrder) => ({ labelHtml, isCorrect, sortOrder })) } : undefined,
          markingScheme: s.scheme ? { create: { criteria: s.scheme, guidanceHtml: '<p>Award marks for each point made clearly.</p>' } } : undefined,
        },
        include: { options: { orderBy: { sortOrder: 'asc' } } },
      })
      qs.push(q)
    }
    return qs
  }

  const igMathQs = await bank(igMath.id, 'IGCSE Maths: Algebra (demo)', [
    { type: 'mcq', topic: 'Linear equations', stem: 'Solve 3x + 5 = 17.', marks: 1, difficulty: 'easy',
      options: [['x = 2', false], ['x = 3', false], ['x = 4', true], ['x = 6', false]], explanation: 'Subtract 5, then divide by 3.' },
    { type: 'true_false', topic: 'Quadratic expressions', stem: '(x + 2)(x + 3) = x² + 6x + 5', marks: 1, answerKey: { value: false },
      explanation: 'It expands to x² + 5x + 6.' },
    { type: 'fill_blank', topic: 'Linear equations', stem: 'If 2(x − 4) = 10 then x = ____.', marks: 1, answerKey: { blanks: [['9']] } },
    { type: 'multi_select', topic: 'Quadratic expressions', stem: 'Select ALL factors of x² + 7x + 12.', marks: 2,
      options: [['(x + 3)', true], ['(x + 2)', false], ['(x + 4)', true], ['(x + 6)', false]] },
    { type: 'short_answer', topic: 'Fractions and percentages', stem: 'Write 0.25 as a percentage.', marks: 1, answerKey: { accepted: ['25%', '25 %', '25 percent'] } },
    { type: 'long_answer', topic: 'Linear equations', stem: 'A taxi charges KES 200 plus KES 50 per km. A ride cost KES 750. Form and solve an equation to find the distance. Show your working.', marks: 4,
      scheme: [{ point: 'Forms 200 + 50d = 750', marks: 2 }, { point: 'Correctly isolates d', marks: 1 }, { point: 'd = 11 km', marks: 1 }] },
  ])
  const igBioQs = await bank(igBio.id, 'IGCSE Biology: Plants & Cells (demo)', [
    { type: 'fill_blank', topic: 'Photosynthesis', stem: 'Light energy is absorbed by ____ found in ____.', marks: 2,
      answerKey: { blanks: [['chlorophyll', 'chlorophyl'], ['chloroplasts', 'chloroplast']] } },
    { type: 'matching', topic: 'Cell structure', stem: 'Match each organelle to its function.', marks: 3,
      answerKey: { pairs: { Nucleus: 'Controls the cell', Mitochondria: 'Aerobic respiration', 'Cell wall': 'Support and shape' } } },
    { type: 'essay', topic: 'Photosynthesis', stem: 'Explain how light intensity, carbon dioxide concentration and temperature each affect the rate of photosynthesis.', marks: 6,
      scheme: [{ point: 'Light: rate increases until it plateaus', marks: 2 }, { point: 'CO₂ as a limiting factor', marks: 2 }, { point: 'Temperature affects enzymes; too high denatures them', marks: 2 }] },
  ])
  const g7MathQs = await bank(g7Math.id, 'Grade 7 Mathematics: Numbers (demo)', [
    { type: 'mcq', topic: 'Whole numbers', stem: 'What is the place value of 2 in 1 208 450?', marks: 1,
      options: [['Thousands', false], ['Ten thousands', false], ['Hundred thousands', true], ['Millions', false]] },
    { type: 'mcq', topic: 'Fractions', stem: 'What is ½ + ⅓?', marks: 1, options: [['2/5', false], ['5/6', true], ['1/6', false], ['2/6', false]] },
    { type: 'true_false', topic: 'Whole numbers', stem: '4 520 316 is greater than 4 502 316.', marks: 1, answerKey: { value: true } },
    { type: 'short_answer', topic: 'Area', stem: 'A rectangle is 8 cm long and 5 cm wide. What is its area in cm²?', marks: 1, answerKey: { accepted: ['40', '40 cm²', '40cm2', '40 cm2'] } },
  ])
  const g7SciQs = await bank(g7Sci.id, 'Grade 7 Integrated Science (demo)', [
    { type: 'matching', topic: 'Separating mixtures', stem: 'Match each mixture to the best separation method.', marks: 3,
      answerKey: { pairs: { 'Sand and water': 'Filtration', 'Salt solution': 'Evaporation', 'Muddy water left to settle': 'Decanting' } } },
    { type: 'multi_select', topic: 'The human digestive system', stem: 'Select ALL organs that are part of the alimentary canal.', marks: 2,
      options: [['Stomach', true], ['Liver', false], ['Small intestine', true], ['Kidney', false]] },
  ])

  // ── Assessments ───────────────────────────────────────────────────────────
  const assessment = async (csId: number, title: string, type: any, qs: { id: number }[], extra: Record<string, unknown> = {}) =>
    db.assessment.create({
      data: {
        curriculumSubjectId: csId, title, type, createdById: editor.id, status: 'published', passMarkPct: 50,
        instructions: 'Answer all questions. Your answers are saved automatically.', ...extra,
        questions: { create: qs.map((q, sortOrder) => ({ questionId: q.id, sortOrder })) },
      },
    })
  const aIgMath = await assessment(igMath.id, 'Algebra mock paper (demo)', 'mock_exam', igMathQs,
    { durationMinutes: 45, maxAttempts: 2, classId: igClass.id, resultsRelease: 'manual', opensAt: days(-14), closesAt: days(14) })
  const aIgBio = await assessment(igBio.id, 'Plants & cells topic test (demo)', 'unit_assessment', igBioQs,
    { durationMinutes: 30, maxAttempts: 1, classId: igClass.id, resultsRelease: 'manual' })
  const aG7Math = await assessment(g7Math.id, 'Numbers quick quiz (demo)', 'topic_quiz', g7MathQs, { maxAttempts: 3 })
  const aG7Sci = await assessment(g7Sci.id, 'Mixtures & digestion practice (demo)', 'practice_test', g7SciQs, { classId: g7Class.id })
  await assessment(igMath.id, 'Timed algebra challenge (opens next week, demo)', 'timed_exam', igMathQs.slice(0, 4),
    { durationMinutes: 20, maxAttempts: 1, opensAt: days(7), closesAt: days(10) })

  // ── Attempts: graded by the real marking engine ───────────────────────────
  type Q = (typeof igMathQs)[number]
  const attempt = async (
    a: { id: number; passMarkPct: number; resultsRelease: string }, learnerId: number, qs: Q[], attemptNo: number,
    responses: Response[], manualScores: Record<number, { score: number; feedback: string }> = {}, daysAgo = 5,
  ) => {
    const at = await db.assessmentAttempt.create({ data: {
      assessmentId: a.id, learnerId, attemptNo, status: 'submitted', startedAt: days(-daysAgo), submittedAt: days(-daysAgo),
      questionOrder: qs.map((q) => q.id),
    } })
    const scored: { score: number | null; marks: number }[] = []
    for (const [idx, q] of qs.entries()) {
      const mark = markAnswer({ type: q.type as QuestionType, marks: q.marks, options: q.options, answerKey: q.answerKey }, responses[idx])
      const m = manualScores[idx]
      const final = mark.requiresManual ? (m?.score ?? null) : mark.score
      scored.push({ score: final, marks: q.marks })
      await db.learnerAnswer.create({ data: {
        attemptId: at.id, questionId: q.id, response: (responses[idx] ?? undefined) as any,
        autoScore: mark.requiresManual ? null : mark.score, manualScore: m?.score ?? null, finalScore: final,
        feedback: m?.feedback ?? null, markedById: m ? (a.id === aIgMath.id || a.id === aIgBio.id ? tDavid.id : tAchieng.id) : null,
        markedAt: m ? days(-daysAgo + 1) : null,
      } })
    }
    const t = totalAttempt(scored, a.passMarkPct)
    if (t.pendingManual) { await db.assessmentAttempt.update({ where: { id: at.id }, data: { status: 'marking' } }); return }
    const released = a.resultsRelease === 'immediate' || Object.keys(manualScores).length > 0
    await db.assessmentAttempt.update({ where: { id: at.id }, data: { status: released ? 'released' : 'marked' } })
    await db.assessmentResult.create({ data: {
      attemptId: at.id, score: t.score, maxScore: t.maxScore, percentage: t.percentage, passed: t.passed,
      releasedAt: released ? days(-daysAgo + 1) : null, releasedById: released && a.resultsRelease !== 'immediate' ? tDavid.id : null,
    } })
  }
  const opt = (q: Q, label: string) => ({ optionId: q.options.find((o) => o.labelHtml === label)!.id })
  const opts = (q: Q, labels: string[]) => ({ optionIds: labels.map((l) => q.options.find((o) => o.labelHtml === l)!.id) })

  // Brian: IGCSE maths, two attempts showing improvement; long answer teacher-marked
  await attempt(aIgMath, brian.id, igMathQs, 1, [
    opt(igMathQs[0], 'x = 6'), { value: true }, { blanks: ['7'] }, opts(igMathQs[3], ['(x + 3)']), { text: '2.5%' },
    { text: '50d = 750 so d = 15' },
  ], { 5: { score: 1, feedback: 'Remember the fixed KES 200 charge: 200 + 50d = 750.' } }, 12)
  await attempt(aIgMath, brian.id, igMathQs, 2, [
    opt(igMathQs[0], 'x = 4'), { value: false }, { blanks: ['9'] }, opts(igMathQs[3], ['(x + 3)', '(x + 4)']), { text: '25%' },
    { text: '200 + 50d = 750, 50d = 550, d = 11 km' },
  ], { 5: { score: 4, feedback: 'Excellent: clear working throughout.' } }, 4)
  // Aisha: maths released; biology essay still awaiting marking (shows the marking queue)
  await attempt(aIgMath, aisha.id, igMathQs, 1, [
    opt(igMathQs[0], 'x = 4'), { value: false }, { blanks: ['9'] }, opts(igMathQs[3], ['(x + 3)', '(x + 6)']), { text: '25 percent' },
    { text: '200 + 50d = 750 → d = 11' },
  ], { 5: { score: 3, feedback: 'Correct answer; show the intermediate step 50d = 550.' } }, 6)
  await attempt(aIgBio, aisha.id, igBioQs, 1, [
    { blanks: ['chlorophyll', 'chloroplasts'] },
    { pairs: { Nucleus: 'Controls the cell', Mitochondria: 'Aerobic respiration', 'Cell wall': 'Controls the cell' } },
    { text: 'As light intensity increases the rate increases until it levels off…' },
  ], {}, 2)
  // Grade 7 learners: auto-marked, immediate release
  await attempt(aG7Math, amani.id, g7MathQs, 1, [opt(g7MathQs[0], 'Ten thousands'), opt(g7MathQs[1], '2/5'), { value: true }, { text: '40 cm²' }], {}, 9)
  await attempt(aG7Math, amani.id, g7MathQs, 2, [opt(g7MathQs[0], 'Hundred thousands'), opt(g7MathQs[1], '5/6'), { value: true }, { text: '40' }], {}, 3)
  await attempt(aG7Math, kevin.id, g7MathQs, 1, [opt(g7MathQs[0], 'Hundred thousands'), opt(g7MathQs[1], '1/6'), { value: false }, { text: '26' }], {}, 5)
  await attempt(aG7Sci, amani.id, g7SciQs, 1, [
    { pairs: { 'Sand and water': 'Filtration', 'Salt solution': 'Evaporation', 'Muddy water left to settle': 'Filtration' } },
    opts(g7SciQs[1], ['Stomach', 'Small intestine', 'Liver']),
  ], {}, 4)
  await attempt(aG7Sci, kevin.id, g7SciQs, 1, [
    { pairs: { 'Sand and water': 'Filtration', 'Salt solution': 'Evaporation', 'Muddy water left to settle': 'Decanting' } },
    opts(g7SciQs[1], ['Stomach', 'Small intestine']),
  ], {}, 2)

  // Topic performance: derived from the graded answers above
  const answers = await db.learnerAnswer.findMany({
    where: { finalScore: { not: null }, attempt: { status: { in: ['released', 'marked'] } } },
    include: { question: true, attempt: true }, orderBy: { attempt: { startedAt: 'asc' } },
  })
  const perf = new Map<string, { learnerId: number; topicId: number; pcts: number[] }>()
  for (const a of answers) {
    if (!a.question.topicId) continue
    const k = `${a.attempt.learnerId}:${a.question.topicId}`
    const e = perf.get(k) ?? { learnerId: a.attempt.learnerId, topicId: a.question.topicId, pcts: [] }
    e.pcts.push((a.finalScore! / a.question.marks) * 100)
    perf.set(k, e)
  }
  for (const e of perf.values())
    await db.topicPerformance.create({ data: {
      learnerId: e.learnerId, topicId: e.topicId, attempts: e.pcts.length,
      avgPct: Math.round(e.pcts.reduce((s, p) => s + p, 0) / e.pcts.length), lastPct: Math.round(e.pcts.at(-1)!),
    } })

  // ── Subscription plans (DEMO PRICES, to be set by admin) ──────────────────
  const plan = (data: any) => db.subscriptionPlan.create({ data })
  const free = await plan({ name: 'Free', slug: 'free', description: 'Sample lessons and limited practice.', priceMinor: 0, billingPeriod: 'free', periodDays: 3650, features: ['Sample lessons', '10 practice questions per subject', 'Progress tracking'], sortOrder: 0 })
  const basic = await plan({ name: 'Basic', slug: 'basic-monthly', description: '[DEMO PRICE] Full lessons for chosen subjects.', priceMinor: 50000, billingPeriod: 'monthly', periodDays: 30, trialDays: 7, features: ['Full lessons (3 subjects)', 'Unlimited practice', 'Topic quizzes'], sortOrder: 1 })
  const premium = await plan({ name: 'Premium', slug: 'premium-termly', description: '[DEMO PRICE] Everything, for up to 3 children.', priceMinor: 300000, billingPeriod: 'termly', periodDays: 120, maxLearners: 3, features: ['All subjects', 'Mock exams', 'Teacher marking', 'Parent reports'], sortOrder: 2 })
  const examPrep = await plan({ name: 'Exam Preparation', slug: 'exam-prep-annual', description: '[DEMO PRICE] Intensive mock exam series.', priceMinor: 800000, billingPeriod: 'annual', periodDays: 365, features: ['Mock exam series', 'Revision plans', 'Priority marking'], sortOrder: 3 })
  await db.planEntitlement.create({ data: { planId: free.id, courseId: cG7Math.course.id } })
  await db.planEntitlement.create({ data: { planId: basic.id, curriculumSubjectId: igMath.id } })
  await db.planEntitlement.create({ data: { planId: basic.id, curriculumSubjectId: g7Math.id } })
  await db.planEntitlement.create({ data: { planId: premium.id, allContent: true } })
  await db.planEntitlement.create({ data: { planId: examPrep.id, allContent: true } })

  // ── Subscriptions, payments, callbacks, invoices (SANDBOX TEST records) ───
  let invoiceNo = 1
  const paidSubscription = async (payer: { id: number }, planRow: typeof premium, learners: { id: number }[], provider: 'mpesa' | 'card', startDaysAgo: number, ref: string) => {
    const sub = await db.subscription.create({ data: {
      payerId: payer.id, planId: planRow.id, status: 'active', currentPeriodStart: days(-startDaysAgo), currentPeriodEnd: days(planRow.periodDays - startDaysAgo),
      learners: { create: learners.map((l) => ({ learnerId: l.id })) },
    } })
    const pay = await db.payment.create({ data: {
      subscriptionId: sub.id, payerId: payer.id, provider, amountMinor: planRow.priceMinor, currency: 'KES', status: 'succeeded',
      merchantReference: `ER-TEST-${ref}`, providerReference: `SANDBOX${ref}`, phoneMasked: provider === 'mpesa' ? '2547****000' : null,
      verifiedAt: days(-startDaysAgo), isTestData: true, createdAt: days(-startDaysAgo),
    } })
    await db.paymentCallback.create({ data: {
      provider, idempotencyKey: `${provider}:SANDBOX${ref}`, paymentId: pay.id, signatureValid: true, processedAt: days(-startDaysAgo),
      payload: { note: 'Seeded sandbox callback (redacted)', ResultCode: 0 },
    } })
    await db.invoice.create({ data: { number: `ER-2026-${String(invoiceNo++).padStart(5, '0')}`, paymentId: pay.id, subscriptionId: sub.id, amountMinor: pay.amountMinor, currency: 'KES', issuedAt: days(-startDaysAgo) } })
    return sub
  }
  await paidSubscription(pWanjiru, premium, [amani, neema], 'mpesa', 20, 'QK7A1')
  await paidSubscription(pSharma, examPrep, [aisha], 'card', 40, 'CD9B2')
  // Peter: basic plan expiring in 2 days, plus one failed and one pending payment
  const brianSub = await db.subscription.create({ data: {
    payerId: pOmondi.id, planId: basic.id, status: 'active', currentPeriodStart: days(-28), currentPeriodEnd: days(2),
    learners: { create: [{ learnerId: brian.id }] },
  } })
  await db.payment.create({ data: { subscriptionId: brianSub.id, payerId: pOmondi.id, provider: 'mpesa', amountMinor: basic.priceMinor, status: 'failed',
    merchantReference: 'ER-TEST-FAIL1', providerReference: 'SANDBOXFAIL1', phoneMasked: '2547****111', failureReason: 'Request cancelled by user (sandbox)', isTestData: true, createdAt: days(-1) } })
  await db.payment.create({ data: { subscriptionId: brianSub.id, payerId: pOmondi.id, provider: 'mpesa', amountMinor: basic.priceMinor, status: 'pending',
    merchantReference: 'ER-TEST-PEND1', phoneMasked: '2547****111', isTestData: true } })
  // Kevin: free plan, self-paying learner
  await db.subscription.create({ data: { payerId: kevin.id, planId: free.id, status: 'active', currentPeriodStart: days(-30), currentPeriodEnd: days(3620), learners: { create: [{ learnerId: kevin.id }] } } })

  // ── Notifications, announcements, support, reports, certificates ──────────
  const notify = (userId: number, type: string, data: object, read = false) =>
    db.notification.create({ data: { userId, type, data, readAt: read ? days(-1) : null } })
  await notify(pWanjiru.id, 'payment_succeeded', { message: 'Payment received for Premium (sandbox test).' }, true)
  await notify(pWanjiru.id, 'result_released', { message: 'Amani’s Numbers quick quiz result is available.' })
  await notify(pOmondi.id, 'payment_failed', { message: 'Your M-Pesa payment was not completed. Please try again.' })
  await notify(pOmondi.id, 'subscription_expiring', { message: 'Brian’s Basic plan expires in 2 days.' })
  await notify(pOmondi.id, 'link_request', { message: 'Zuri Otieno asked to link to your account. Approve to activate their learning.' })
  await notify(brian.id, 'result_released', { message: 'Your Algebra mock paper result has been released.' })
  await notify(brian.id, 'exam_available', { message: 'Timed algebra challenge opens next week.' })
  await notify(tDavid.id, 'marking_required', { message: 'Aisha Sharma’s Plants & cells essay is waiting to be marked.' })
  await notify(amani.id, 'new_content', { message: 'New lesson: Adding fractions.' }, true)

  await db.announcement.create({ data: { authorId: admin.id, title: 'Welcome to Elite Revision (demo)', bodyHtml: '<p>This is a demonstration environment with test data.</p>', audience: { roles: ['learner', 'parent', 'teacher'] }, publishedAt: days(-7) } })
  await db.announcement.create({ data: { authorId: admin.id, title: 'CBC Grade 7 mock week (demo)', bodyHtml: '<p>Practice tests for Grade 7 open next Monday.</p>', audience: { roles: ['learner'], curriculum: 'cbc' }, publishedAt: days(-1), expiresAt: days(14) } })

  const ticket = await db.supportTicket.create({ data: { requesterId: pOmondi.id, assigneeId: admin.id, subject: 'M-Pesa payment did not go through (demo)', status: 'pending', priority: 'high' } })
  await db.supportTicketMessage.create({ data: { ticketId: ticket.id, authorId: pOmondi.id, body: 'I cancelled the prompt by mistake. How do I retry?' } })
  await db.supportTicketMessage.create({ data: { ticketId: ticket.id, authorId: admin.id, body: 'You can retry from Subscriptions → Pay now. The failed attempt was not charged.' } })
  await db.supportTicket.create({ data: { requesterId: brian.id, subject: 'Question about the algebra mock (demo)' } })

  await db.progressReport.create({ data: {
    learnerId: amani.id, generatedById: tAchieng.id, periodStart: days(-30), periodEnd: days(0),
    data: { note: 'Generated from seeded demo attempts', lessonsCompleted: 1, assessmentsTaken: 3 },
  } })
  await db.certificate.create({ data: { learnerId: aisha.id, courseId: cIgMath.course.id, verificationCode: 'DEMO-CERT-0001', issuedAt: days(-3) } })

  // ── Platform settings & audit trail ───────────────────────────────────────
  const settings: [string, unknown, boolean][] = [
    ['platform.name', 'Elite Revision', true], ['platform.tagline', 'Learn. Practise. Prepare. Succeed.', true],
    ['platform.support_email', 'support@elite-revision.com', true], ['billing.default_currency', 'KES', true],
    ['billing.termly_period_days', 120, false], ['content.require_approval', true, false],
    ['privacy.guardian_consent_age', 18, false], ['privacy.policy_version', '2026-11', true],
    ['assessment.autosubmit_grace_seconds', 30, false], ['features.certificates', true, true],
  ]
  for (const [key, value, isPublic] of settings) await db.systemSetting.create({ data: { key, value: value as any, isPublic } })

  await db.auditLog.create({ data: { actorId: admin.id, action: 'seed.run', entityType: 'system', newValues: { note: 'Demo data seeded' } } })
  await db.auditLog.create({ data: { actorId: admin.id, action: 'role.assigned', entityType: 'user', entityId: String(tDavid.id), newValues: { role: 'teacher' } } })
  await db.auditLog.create({ data: { actorId: tDavid.id, action: 'result.released', entityType: 'assessment', entityId: String(aIgMath.id) } })

  // Summary
  const counts = {
    users: await db.user.count(), roles: await db.role.count(), permissions: await db.permission.count(), levels: await db.academicLevel.count(),
    subjects: await db.subject.count(), topics: await db.topic.count(), courses: await db.course.count(), lessons: await db.lesson.count(),
    questions: await db.question.count(), assessments: await db.assessment.count(), attempts: await db.assessmentAttempt.count(),
    results: await db.assessmentResult.count(), subscriptions: await db.subscription.count(), payments: await db.payment.count(),
  }
  console.table(counts)
  console.log(`\nDemo logins (password from SEED_DEMO_PASSWORD): admin, editor, teacher.achieng, teacher.david, parent.grace, parent.peter, parent.priya, amani, neema, brian, aisha, kevin, zuri`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
