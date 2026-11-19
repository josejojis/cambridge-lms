import { createBrowserRouter, type RouteObject } from 'react-router'
import { PublicLayout } from '../components/layout/PublicLayout'
import { HomePage } from '../features/public/pages/HomePage'
import { AboutPage } from '../features/public/pages/AboutPage'
import { CurriculumPage } from '../features/public/pages/CurriculumPage'
import { CoursesPage } from '../features/public/pages/CoursesPage'
import { ExamCentrePage } from '../features/public/pages/ExamCentrePage'
import { PricingPage } from '../features/public/pages/PricingPage'
import { ContactPage } from '../features/public/pages/ContactPage'
import { LoginPage, RegisterPage, TwoFactorPage } from '../features/public/pages/AuthPages'
import { TermsPage, PrivacyPage } from '../features/public/pages/LegalPages'
import { NotFoundPage } from '../features/public/pages/NotFoundPage'
import { AccountHome } from '../features/account/AccountHome'

export const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'cambridge', element: <CurriculumPage curriculum="cambridge" /> },
      { path: 'cbc', element: <CurriculumPage curriculum="cbc" /> },
      { path: 'courses', element: <CoursesPage /> },
      { path: 'exam-centre', element: <ExamCentrePage /> },
      { path: 'pricing', element: <PricingPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'login/two-factor', element: <TwoFactorPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      // Role homes: one account page until the Phase 5 dashboards replace them
      ...['learn', 'parent', 'teacher', 'admin'].map((path) => ({ path, element: <AccountHome /> })),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
