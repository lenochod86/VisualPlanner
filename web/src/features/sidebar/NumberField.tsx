interface Props {
  label: string
  value: number
  onChange: (value: number) => void
}

export function NumberField({ label, value, onChange }: Props) {
  return (
    <label className="field">{label}
      <input
        type="number" value={Math.round(value)}
        onChange={e => {
          const v = parseFloat(e.target.value)
          if (!isNaN(v)) onChange(v)
        }}
      />
    </label>
  )
}
