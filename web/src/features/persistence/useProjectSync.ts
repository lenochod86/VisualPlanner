import { useEffect, useState } from 'react'
import { fetchProject, putProject } from '../../api/projectsApi'
import { PROJECT_ID } from '../../config'
import { clearHistory } from '../../store/history'
import { projectChanged, selectProject, useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'

export type SyncStatus = 'loading' | 'saving' | 'saved' | 'offline'

const SAVE_DELAY_MS = 700

/**
 * Při startu načte projekt ze serveru a pak ho (s krátkým zpožděním) ukládá
 * po každé změně. Vrací stav synchronizace pro zobrazení v UI.
 */
export function useProjectSync(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>('loading')

  useEffect(() => {
    let ready = false          // dokud se nenačte projekt, nic neukládáme (nepřepsali bychom data serveru)
    let timer: ReturnType<typeof setTimeout> | undefined

    const save = async () => {
      try {
        await putProject(PROJECT_ID, selectProject(useProjectStore.getState()))
        setStatus('saved')
      } catch {
        setStatus('offline')
      }
    }

    const unsubscribe = useProjectStore.subscribe((state, prev) => {
      if (!ready || !projectChanged(state, prev)) return
      setStatus('saving')
      clearTimeout(timer)
      timer = setTimeout(save, SAVE_DELAY_MS)
    })

    fetchProject(PROJECT_ID)
      .then(async project => {
        if (project) {
          useProjectStore.getState().loadProject(project)
          clearHistory() // načtení ze serveru nemá být možné vrátit zpět
          useUiStore.getState().requestFit()
          setStatus('saved')
        } else {
          await save() // server zatím nic nemá: uložíme výchozí projekt
        }
      })
      .catch(() => setStatus('offline'))
      .finally(() => { ready = true })

    return () => { clearTimeout(timer); unsubscribe() }
  }, [])

  return status
}
