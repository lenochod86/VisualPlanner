/** Plocha v cm² -> "12,3 m²" */
export function formatAreaM2(areaCm2: number): string {
  return `${(areaCm2 / 10000).toFixed(1).replace('.', ',')} m²`
}
