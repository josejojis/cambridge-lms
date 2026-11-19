import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '../lib/i18n'
import { routes } from './router'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false, () => {}], offlineReady: [false, () => {}], updateServiceWorker: () => {} }),
}))
vi.mock('../lib/auth-client', () => ({ authClient: {} }))
// No API in unit tests: every request answers 401 (signed out)
vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: 'Please sign in.' }), { status: 401 }))))

const renderAt = (path: string) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
  </QueryClientProvider>,
)

describe('public routes', () => {
  it.each([
    ['/', /Learn\. Practise\./],
    ['/cambridge', /Cambridge International/],
    ['/cbc', /Kenya Competency-Based Curriculum/],
    ['/pricing', /Simple plans/],
    ['/login', /Welcome back/],
    ['/register', /Create your account/],
    ['/privacy', /Privacy Policy/],
  ])('renders %s', (path, heading) => {
    renderAt(path)
    expect(screen.getAllByRole('heading', { level: 1 })[0]).toHaveTextContent(heading)
  })

  it('shows 404 for unknown paths', () => {
    renderAt('/nope')
    expect(screen.getByText('Page not found')).toBeInTheDocument()
  })

  it('always shows the non-affiliation disclaimer', () => {
    renderAt('/')
    expect(screen.getByText(/not affiliated with/)).toBeInTheDocument()
  })

  it('validates registration with the shared schema before calling the API', async () => {
    renderAt('/register')
    screen.getByRole('button', { name: /create account/i }).click()
    expect(await screen.findByText(/accept the terms/i)).toBeInTheDocument()
  })
})
