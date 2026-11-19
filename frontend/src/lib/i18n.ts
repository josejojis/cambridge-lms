import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

/** English + Kiswahili. Add keys here as screens are translated; English is the fallback. */
const resources = {
  en: { translation: {
    nav: { cambridge: 'Cambridge', cbc: 'Kenya CBC', courses: 'Courses', exams: 'Exam Centre', pricing: 'Pricing', about: 'About', login: 'Log in', start: 'Start free', logout: 'Log out', account: 'My account' },
    auth: { welcome: 'Welcome back', loginOrEmail: 'Email or username', password: 'Password', login: 'Log in', create: 'Create your account', createBtn: 'Create account', name: 'Full name', username: 'Username', email: 'Email', learner: 'I’m a learner', parent: 'I’m a parent' },
    offline: { banner: 'You’re offline. Saved lessons and your answers are kept on this device.', pending_one: '{{count}} answer waiting to sync', pending_other: '{{count}} answers waiting to sync' },
    account: { pending: 'Waiting for your parent or guardian to approve your account. You can browse, but lessons and exams unlock after approval.', revise: 'Revise today', nothingDue: 'Nothing due today. Great work!', linkRequests: 'Children waiting for your approval', approve: 'Approve', reject: 'Decline', children: 'Your children' },
  } },
  sw: { translation: {
    nav: { cambridge: 'Cambridge', cbc: 'CBC Kenya', courses: 'Kozi', exams: 'Kituo cha Mitihani', pricing: 'Bei', about: 'Kuhusu', login: 'Ingia', start: 'Anza bure', logout: 'Toka', account: 'Akaunti yangu' },
    auth: { welcome: 'Karibu tena', loginOrEmail: 'Barua pepe au jina la mtumiaji', password: 'Nenosiri', login: 'Ingia', create: 'Fungua akaunti yako', createBtn: 'Fungua akaunti', name: 'Jina kamili', username: 'Jina la mtumiaji', email: 'Barua pepe', learner: 'Mimi ni mwanafunzi', parent: 'Mimi ni mzazi' },
    offline: { banner: 'Hauko mtandaoni. Masomo uliyohifadhi na majibu yako yamehifadhiwa kwenye kifaa hiki.', pending_one: 'Jibu {{count}} linasubiri kutumwa', pending_other: 'Majibu {{count}} yanasubiri kutumwa' },
    account: { pending: 'Tunasubiri mzazi au mlezi wako aidhinishe akaunti yako. Masomo na mitihani yatafunguliwa baada ya idhini.', revise: 'Rudia leo', nothingDue: 'Hakuna cha kurudia leo. Kazi nzuri!', linkRequests: 'Watoto wanaosubiri idhini yako', approve: 'Idhinisha', reject: 'Kataa', children: 'Watoto wako' },
  } },
} as const

const stored = (() => { try { return localStorage.getItem('lang') } catch { return null } })()

void i18n.use(initReactI18next).init({
  resources,
  lng: stored ?? (navigator.language.startsWith('sw') ? 'sw' : 'en'),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function setLanguage(lng: 'en' | 'sw') {
  void i18n.changeLanguage(lng)
  document.documentElement.lang = lng
  try { localStorage.setItem('lang', lng) } catch { /* private mode */ }
}

export default i18n
