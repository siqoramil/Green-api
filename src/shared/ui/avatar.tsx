import { cn } from '@/shared/lib'

const GRADIENTS = [
  'from-[#ff9a62] to-[#ff5e7e]',
  'from-[#5ec8ff] to-[#3a6bff]',
  'from-[#7ee38b] to-[#22a86a]',
  'from-[#c38bff] to-[#7a4dff]',
  'from-[#ffd36b] to-[#ff9d2e]',
  'from-[#6be3d9] to-[#1a9bb8]',
  'from-[#ff8ad1] to-[#d94dff]',
]

function hash(value: string): number {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0
  return Math.abs(h)
}

function initials(title: string): string {
  const [first = '', second = ''] = title.replace(/[^\p{L}\p{N}\s]/gu, '').trim().split(/\s+/)
  if (!first) return '#'
  const letters = second ? `${first.charAt(0)}${second.charAt(0)}` : first.slice(0, 2)
  return /^\d+$/.test(letters) ? '#' : letters.toUpperCase()
}

interface AvatarProps {
  id: string
  title: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = { sm: 'size-10 text-sm', md: 'size-12 text-base', lg: 'size-20 text-2xl' }

export function Avatar({ id, title, size = 'md', className }: AvatarProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex shrink-0 select-none items-center justify-center rounded-full bg-linear-to-br font-semibold text-white',
        GRADIENTS[hash(id) % GRADIENTS.length],
        SIZES[size],
        className,
      )}
    >
      {initials(title)}
    </div>
  )
}
