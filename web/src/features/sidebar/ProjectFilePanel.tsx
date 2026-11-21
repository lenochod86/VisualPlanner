import { useRef, useState } from 'react'
import { parseProject } from '../../domain/project'
import { selectProject, useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'

/** Záloha projektu do JSON souboru a načtení zpět. */
export function ProjectFilePanel() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const exportProject = () => {
    const json = JSON.stringify(selectProject(useProjectStore.getState()), null, 2)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    link.download = 'byt.json'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const importProject = async (file: File) => {
    try {
      useProjectStore.getState().loadProject(parseProject(JSON.parse(await file.text())))
      useUiStore.getState().select(null)
      useUiStore.getState().requestFit()
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import se nezdařil.')
    }
  }

  return (
    <section>
      <h2>Soubor</h2>
      <div className="row">
        <button onClick={exportProject}>Exportovat JSON</button>
        <button onClick={() => fileInput.current?.click()}>Importovat…</button>
      </div>
      <input ref={fileInput} type="file" accept="application/json" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) importProject(f); e.target.value = '' }} />
      {error && <small className="error">{error}</small>}
    </section>
  )
}
