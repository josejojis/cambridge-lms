// Marketing copy for the public site. Course and plan data will come from the API
// once the catalogue endpoints exist; nothing here represents real learner data.

export const curricula = {
  cambridge: {
    name: 'Cambridge International',
    short: 'Cambridge',
    blurb: 'Structured revision from the primary key stages through IGCSE, AS and A Level, organised by unit, topic and learning objective.',
    stages: ['Key Stage 1', 'Key Stage 2', 'Key Stage 3', 'Key Stage 4', 'Key Stage 5', 'IGCSE', 'AS Level', 'A Level'],
    hierarchy: ['Stage / qualification', 'Subject', 'Unit', 'Topic', 'Learning objective'],
  },
  cbc: {
    name: 'Kenya Competency-Based Curriculum',
    short: 'Kenya CBC',
    blurb: 'Competency-focused practice for every CBC stage, mapped to learning areas, strands, sub-strands and learning outcomes.',
    stages: ['Pre-Primary', 'Lower Primary', 'Upper Primary', 'Junior School', 'Senior School'],
    hierarchy: ['Stage / grade', 'Learning area', 'Strand', 'Sub-strand', 'Learning outcome'],
  },
} as const

export const featuredSubjects = [
  { name: 'Mathematics', icon: 'Sigma', levels: 'All stages' },
  { name: 'English', icon: 'BookOpen', levels: 'All stages' },
  { name: 'Biology', icon: 'Leaf', levels: 'IGCSE · AS · A Level' },
  { name: 'Chemistry', icon: 'FlaskConical', levels: 'IGCSE · AS · A Level' },
  { name: 'Physics', icon: 'Atom', levels: 'IGCSE · AS · A Level' },
  { name: 'Integrated Science', icon: 'Microscope', levels: 'CBC Junior School' },
  { name: 'Kiswahili', icon: 'Languages', levels: 'CBC all grades' },
  { name: 'Computer Science', icon: 'Cpu', levels: 'IGCSE · A Level' },
] as const

export const steps = [
  { title: 'Choose your curriculum', body: 'Pick Cambridge or CBC, then your stage or grade. Your dashboard adapts to it.' },
  { title: 'Learn topic by topic', body: 'Clear notes, worked examples and diagrams for each topic, so you can stop and resume where you left off.' },
  { title: 'Practise and test', body: 'Instant-feedback quizzes, timed mock exams, and written answers marked by teachers.' },
  { title: 'Track and improve', body: 'See strong and weak topics, and get revision suggestions based on your real results.' },
]

export const faqs = [
  { q: 'Which curricula does Elite Revision support?', a: 'Cambridge International (Key Stages 1 to 5, IGCSE, AS and A Level) and the Kenya Competency-Based Curriculum from Pre-Primary to Senior School.' },
  { q: 'Is Elite Revision an official Cambridge or KICD product?', a: 'No. Elite Revision is an independent platform. Our learning materials and practice questions are written by our own team and follow the published curriculum structures.' },
  { q: 'How do parents follow progress?', a: 'Parents create their own account and link their children. They then see progress, results and weak topics for those children only.' },
  { q: 'How do I pay?', a: 'Subscriptions can be paid by M-Pesa or by card. Your access starts only after the payment provider has confirmed the payment.' },
  { q: 'Can learners under 18 sign up themselves?', a: 'Yes. Their account stays limited until a parent or guardian approves it and gives consent, as Kenya’s Data Protection Act requires.' },
  { q: 'Does it work on phones?', a: 'Yes. Elite Revision works on phones, tablets and computers, and you can install it on your home screen like an app.' },
]
