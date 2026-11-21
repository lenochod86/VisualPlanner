import { useProjectStore } from '../../store/projectStore'
import { canEditInMode, useUiStore } from '../../store/uiStore'
import { OBSTACLE_KINDS } from '../../domain/catalog'
import { ELECTRIC_KINDS } from '../../domain/electricCatalog'
import { FURNITURE_KINDS, isDecor } from '../../domain/furnitureCatalog'
import { CableProperties } from './CableProperties'
import { ElectricProperties } from './ElectricProperties'
import { ElectroReport } from './ElectroReport'
import { ElectroPanel } from './ElectroPanel'
import { DecorPanel } from './DecorPanel'
import { FlatSummary } from './FlatSummary'
import { FurnitureProperties } from './FurnitureProperties'
import { FurnitureIssues } from './FurnitureIssues'
import { FurniturePanel } from './FurniturePanel'
import { ObstacleProperties } from './ObstacleProperties'
import { RoomProperties } from './RoomProperties'
import { RoomsPanel } from './RoomsPanel'

/** Poznámka u vybrané věci, kterou tahle záložka neupravuje. */
function LockedNote({ title, where, extra }: { title: string; where: string; extra?: string }) {
  return (
    <section>
      <h2>Vybráno: {title}</h2>
      <small>Upravuje se v záložce {where}. {extra}</small>
    </section>
  )
}

/**
 * Levý panel. Nahoře nástroje podle záložky z horní lišty (Půdorys / Vybavení / Elektro),
 * pod nimi vlastnosti toho, co je právě vybráno, ať je to cokoli.
 */
export function Sidebar() {
  const mode = useUiStore(s => s.mode)
  const selection = useUiStore(s => s.selection)
  const room = useProjectStore(s => (selection?.type === 'room' ? s.rooms.find(r => r.id === selection.id) : undefined))
  const obstacle = useProjectStore(s => (selection?.type === 'obstacle' ? s.obstacles.find(o => o.id === selection.id) : undefined))
  const furniture = useProjectStore(s => (selection?.type === 'furniture' ? s.furniture.find(f => f.id === selection.id) : undefined))
  const electric = useProjectStore(s => (selection?.type === 'electric' ? s.electric.find(p => p.id === selection.id) : undefined))
  const cable = useProjectStore(s => (selection?.type === 'cable' ? s.cables.find(c => c.id === selection.id) : undefined))

  return (
    <aside className="sidebar">
      {mode === 'plan' && <RoomsPanel />}
      {mode === 'equipment' && <FurniturePanel />}
      {mode === 'equipment' && <FurnitureIssues />}
      {mode === 'decor' && <DecorPanel />}
      {mode === 'electro' && <ElectroPanel />}

      {/* Každá záložka upravuje jen svou vrstvu; vybranou věc z jiné záložky panel jen pojmenuje a řekne, kde se upravuje. */}
      {room && (canEditInMode('room', mode)
        ? <RoomProperties room={room} />
        : <LockedNote title={`Místnost: ${room.name}`} where='Půdorys' extra="Nové věci se přidávají do této místnosti." />)}
      {obstacle && (canEditInMode('obstacle', mode)
        ? <ObstacleProperties obstacle={obstacle} />
        : <LockedNote title={OBSTACLE_KINDS[obstacle.kind].label} where='Půdorys' />)}
      {furniture && (canEditInMode('furniture', mode, furniture.kind)
        ? <FurnitureProperties furniture={furniture} />
        : <LockedNote title={FURNITURE_KINDS[furniture.kind].label} where={isDecor(furniture.kind) ? 'Dekorace' : 'Vybavení'} />)}
      {electric && (canEditInMode('electric', mode)
        ? <ElectricProperties point={electric} />
        : <LockedNote title={ELECTRIC_KINDS[electric.kind].label} where='Elektro' />)}
      {cable && (canEditInMode('cable', mode)
        ? <CableProperties cable={cable} />
        : <LockedNote title="Kabel" where='Elektro' />)}

      {mode === 'plan' && <FlatSummary />}
      {mode === 'electro' && <ElectroReport />}

      <small className="hint">
        Táhni stěnu = změna rozměru. Klik na číslo = zadání rozměru. Kolečko = zoom, tažení pozadí = posun.
        Nábytek a prvky jdou tahat i ve 3D. Delete = smazat vybrané, R = otočit nábytek (Shift+R opačně), Esc = zrušit výběr,
        Ctrl+Z / Ctrl+Y = zpět / znovu.
      </small>
    </aside>
  )
}
