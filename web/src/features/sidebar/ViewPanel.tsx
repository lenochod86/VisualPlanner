import { useUiStore, type CeilingView, type ElectroView } from '../../store/uiStore'

/** Posuvník neprůhlednosti: vlevo průhledné, vpravo plné. */
function OpacitySlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="field">{label}
      <input type="range" min={0.1} max={1} step={0.05} value={value}
        title="Vlevo průhledné, vpravo plné"
        onChange={e => onChange(parseFloat(e.target.value))} />
    </label>
  )
}

export function ViewPanel() {
  const wallOpacity = useUiStore(s => s.wallOpacity)
  const setWallOpacity = useUiStore(s => s.setWallOpacity)
  const furnitureOpacity = useUiStore(s => s.furnitureOpacity)
  const setFurnitureOpacity = useUiStore(s => s.setFurnitureOpacity)
  const ceilingView = useUiStore(s => s.ceilingView)
  const setCeilingView = useUiStore(s => s.setCeilingView)
  const electroView = useUiStore(s => s.electroView)
  const setElectroView = useUiStore(s => s.setElectroView)
  const requestFit = useUiStore(s => s.requestFit)

  return (
    <section>
      <h2>Zobrazení</h2>
      <button onClick={requestFit}>Přizpůsobit půdorys</button>
      <OpacitySlider label="Zdi ve 3D" value={wallOpacity} onChange={setWallOpacity} />
      <OpacitySlider label="Nábytek ve 3D" value={furnitureOpacity} onChange={setFurnitureOpacity} />
      <label className="field">Strop ve 3D
        <select value={ceilingView} onChange={e => setCeilingView(e.target.value as CeilingView)}>
          <option value="off">skrytý</option>
          <option value="solid">plný</option>
          <option value="transparent">průhledný (rastr)</option>
        </select>
      </label>
      <label className="field">Elektro ve 3D
        <select value={electroView} onChange={e => setElectroView(e.target.value as ElectroView)}>
          <option value="off">skryté</option>
          <option value="on">zobrazené</option>
          <option value="xray">skrz zdi a nábytek</option>
        </select>
      </label>
      <small>Posuvníky: vlevo průhledné, vpravo plné.</small>
    </section>
  )
}
