import { useRef, useState } from 'react'

interface InputProps {
  value: number
  /** Zavolá se jen s platným číslem, a to až po potvrzení (Enter nebo opuštění pole). */
  onCommit: (value: number) => void
}

/**
 * Číselné pole, které se během psaní nepřepočítává: rozepsané "4" při psaní "450" nesmí
 * jako rozměr stěny nikoho překvapit. Esc zahodí rozepsanou hodnotu.
 */
export function NumberInput({ value, onCommit }: InputProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const cancelled = useRef(false)
  const shown = String(Math.round(value))

  const commit = () => {
    if (draft !== null && !cancelled.current) {
      const parsed = parseFloat(draft.replace(',', '.'))
      if (Number.isFinite(parsed) && parsed !== Math.round(value)) onCommit(parsed)
    }
    cancelled.current = false
    setDraft(null)
  }

  return (
    <input
      type="text" inputMode="decimal"
      value={draft ?? shown}
      onFocus={e => { setDraft(shown); e.target.select() }}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') { cancelled.current = true; e.currentTarget.blur() }
      }}
    />
  )
}

export function NumberField({ label, ...input }: InputProps & { label: string }) {
  return (
    <label className="field">{label}
      <NumberInput {...input} />
    </label>
  )
}
