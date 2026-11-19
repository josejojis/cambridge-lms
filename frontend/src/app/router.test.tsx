import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from './router'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false, () => {}], offlineReady: [false, () => {}], updateServiceWorker: () => {} }),
}))

const renderAt = (path: string) => render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)

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
})
