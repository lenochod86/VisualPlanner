import { Edges } from '@react-three/drei'

/** Modrý drátěný rámeček kolem vybraného objektu (lokální souřadnice skupiny: střed spodní hrany v počátku). */
export function SelectionBox({ size, center }: { size: [number, number, number]; center: [number, number, number] }) {
  return (
    <mesh position={center} raycast={() => null}>
      <boxGeometry args={size} />
      <meshBasicMaterial visible={false} />
      <Edges color="#2f6fed" />
    </mesh>
  )
}
