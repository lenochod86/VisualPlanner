import { useState } from 'react'
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

/**
 * Ovládání 3D zobrazení v hlavičce 3D panelu: rychlý přepínač průhledných předních stěn a nabídka Zobrazení
 * (průhlednost zdí a nábytku, strop, elektro).
 */
export function ViewMenu() {
  const [open, setOpen] = useState(false)
  const ui = useUiStore()

  return (
    <div className="view-menu">
      <div className="view-menu-bar">
        <button onClick={() => setOpen(!open)} className={open ? 'active' : ''}>⚙ Zobrazení</button>
        <button
          onClick={ui.toggleGhostFrontWalls} className={ui.ghostFrontWalls ? 'active' : ''}
          title="Stěny, které hledí na kameru, jsou průhledné, aby šlo vidět dovnitř"
        >
          ◧ Přední stěny průhledné
        </button>
      </div>
      {open && (
        <div className="view-menu-popover">
          <OpacitySlider label="Zdi" value={ui.wallOpacity} onChange={ui.setWallOpacity} />
          <OpacitySlider label="Nábytek" value={ui.furnitureOpacity} onChange={ui.setFurnitureOpacity} />
          <label className="field">Strop
            <select value={ui.ceilingView} onChange={e => ui.setCeilingView(e.target.value as CeilingView)}>
              <option value="off">skrytý</option>
              <option value="solid">plný</option>
              <option value="transparent">průhledný (rastr)</option>
            </select>
          </label>
          <label className="field">Elektro
            <select value={ui.electroView} onChange={e => ui.setElectroView(e.target.value as ElectroView)}>
              <option value="off">skryté</option>
              <option value="on">zobrazené</option>
              <option value="xray">skrz zdi a nábytek</option>
            </select>
          </label>
          <small>Posuvníky: vlevo průhledné, vpravo plné.</small>
        </div>
      )}
    </div>
  )
}
