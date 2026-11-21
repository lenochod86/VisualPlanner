import { useUiStore } from '../../store/uiStore'

export function ViewPanel() {
  const wallOpacity = useUiStore(s => s.wallOpacity)
  const setWallOpacity = useUiStore(s => s.setWallOpacity)
  const requestFit = useUiStore(s => s.requestFit)

  return (
    <section>
      <h2>Zobrazení</h2>
      <button onClick={requestFit}>Přizpůsobit půdorys</button>
      <label className="field">Průhlednost zdí (3D)
        <input type="range" min={0.1} max={1} step={0.05} value={wallOpacity}
          onChange={e => setWallOpacity(parseFloat(e.target.value))} />
      </label>
    </section>
  )
}
