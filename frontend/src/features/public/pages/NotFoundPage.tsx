import { ButtonLink } from '../../../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-7xl font-semibold text-gold-600">404</p>
      <h1 className="mt-4 text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 text-muted">The page you’re looking for doesn’t exist or has moved.</p>
      <ButtonLink to="/" variant="navy" className="mt-8">Back to home</ButtonLink>
    </div>
  )
}
