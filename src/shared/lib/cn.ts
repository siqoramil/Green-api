import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Joins class names and resolves Tailwind conflicts (the last one wins: `rounded-md` + `rounded-full` → `rounded-full`). */
export const cn = (...classes: ClassValue[]): string => twMerge(clsx(classes))
