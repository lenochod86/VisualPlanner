import type { Placed } from '../../domain/types'
import { NumberField } from './NumberField'

/** Společná pole rozměrů překážek a nábytku. */
export function PlacedFields({ item, onChange }: { item: Placed; onChange: (patch: Partial<Placed>) => void }) {
  return (
    <>
      <NumberField label="Šířka (cm)" value={item.w} onCommit={v => onChange({ w: Math.max(5, v) })} />
      <NumberField label="Hloubka (cm)" value={item.d} onCommit={v => onChange({ d: Math.max(2, v) })} />
      <NumberField label="Výška (cm)" value={item.h} onCommit={v => onChange({ h: Math.max(5, v) })} />
      <NumberField label="Od podlahy (cm)" value={item.elev} onCommit={v => onChange({ elev: Math.max(0, v) })} />
    </>
  )
}
