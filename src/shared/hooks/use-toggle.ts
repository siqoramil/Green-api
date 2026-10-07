import { useState } from 'react'

export interface ToggleControls {
  on: () => void
  off: () => void
  toggle: () => void
}

/** Boolean state with named, stable setters. */
export function useToggle(initial = false): readonly [boolean, ToggleControls] {
  const [value, setValue] = useState<boolean>(initial)
  const controls: ToggleControls = {
    on: () => setValue(true),
    off: () => setValue(false),
    toggle: () => setValue((current) => !current),
  }
  return [value, controls] as const
}
