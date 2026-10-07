import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const base = ({ size = 24, ...props }: IconProps): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
  ...props,
})

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const BackIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
)

export const SendIcon = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M3.4 20.4 21 12 3.4 3.6l-.01 6.53L15 12 3.39 13.87z" />
  </svg>
)

export const ChatsIcon = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M12 3C6.48 3 2 6.94 2 11.8c0 2.6 1.29 4.94 3.34 6.55L4.5 21.5l3.9-1.84c1.13.32 2.34.5 3.6.5 5.52 0 10-3.94 10-8.8S17.52 3 12 3Zm-4 10a1.2 1.2 0 1 1 0-2.4A1.2 1.2 0 0 1 8 13Zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z" />
  </svg>
)

export const LogoutIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" />
  </svg>
)

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
)

export const EyeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export const EyeOffIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.8 17.8 0 0 1-2.2 3.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7c1.9 0 3.5-.6 4.9-1.4M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
)

export const ArrowDownIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </svg>
)

export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)} viewBox="0 0 16 16" strokeWidth={1.5}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 5v3l2 1.5" />
  </svg>
)

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)} viewBox="0 0 16 16" strokeWidth={1.6}>
    <path d="m3 8.5 3 3 7-7" />
  </svg>
)

export const DoubleCheckIcon = (p: IconProps) => (
  <svg {...base(p)} viewBox="0 0 20 16" width={(p.size ?? 16) * 1.25} strokeWidth={1.6}>
    <path d="m1.5 8.5 3 3 7-7M8.5 11.5l7-7M7 10l1.5 1.5" />
  </svg>
)

export const AlertIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4.5M12 16h.01" />
  </svg>
)

export const LogoMark = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden focusable={false}>
    <defs>
      <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3ab4ff" />
        <stop offset=".55" stopColor="#3a5bff" />
        <stop offset="1" stopColor="#9b3dff" />
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="12" fill="url(#logo-g)" />
    <path
      fill="#fff"
      d="M20 9c-6.1 0-11 4.4-11 9.8 0 2.9 1.4 5.5 3.7 7.3l-.9 3.9 4.4-2.1c1.2.4 2.5.6 3.8.6 6.1 0 11-4.4 11-9.8S26.1 9 20 9Z"
    />
  </svg>
)
