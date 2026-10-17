export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b8cff" />
          <stop offset="1" stopColor="#1f55e0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-grad)" />
      <rect x="17" y="25" width="30" height="26" rx="5" fill="#fff" />
      <path d="M24 25v-3a8 8 0 0 1 16 0v3" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M38 34c-1.2-1.8-3.2-2.7-5.4-2.7-3 0-5 1.5-5 3.6 0 4.6 10.6 1.9 10.6 6.8 0 2.2-2.1 3.7-5.2 3.7-2.5 0-4.6-1.1-5.7-3" fill="none" stroke="#2f6bff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export default function Logo({ size = 36, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="font-display text-xl font-extrabold tracking-tight">
        Suuq<span className="text-volt-400">Mart</span>
      </span>
    </span>
  )
}
