import { Link } from 'react-router'
import type { ComponentProps, ReactNode } from 'react'

type Variant = 'gold' | 'navy' | 'outline' | 'ghost-light'
type Size = 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none'
const variants: Record<Variant, string> = {
  gold: 'bg-gold-500 text-navy-950 hover:bg-gold-400 shadow-sm',
  navy: 'bg-navy-900 text-white hover:bg-navy-800',
  outline: 'border border-navy-900/20 text-navy-900 hover:border-navy-900 hover:bg-navy-50',
  'ghost-light': 'border border-white/25 text-white hover:bg-white/10',
}
const sizes: Record<Size, string> = { md: 'h-11 px-5 text-sm', lg: 'h-13 px-7 text-base' }

export function buttonClass(variant: Variant = 'gold', size: Size = 'md', extra = '') {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`
}

export function ButtonLink({
  to, variant, size, className = '', children,
}: { to: string; variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  return <Link to={to} className={buttonClass(variant, size, className)}>{children}</Link>
}

export function Button({
  variant, size, className = '', ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />
}
