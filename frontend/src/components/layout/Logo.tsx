import { Link } from 'react-router'

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Elite Revision home">
      <img src="/favicon.svg" alt="" width={36} height={36} className="h-9 w-9" />
      <span className={`font-display text-xl font-semibold tracking-tight ${light ? 'text-white' : 'text-navy-900'}`}>
        Elite<span className={light ? 'text-gold-400' : 'text-gold-600'}> Revision</span>
      </span>
    </Link>
  )
}
