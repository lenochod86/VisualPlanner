// Tisk a stažení půdorysu (prohlížečové části; samotné sestavení výkresu je v planSvg.ts).
import type { PlanSvg } from './planSvg'

/**
 * Otevře všechny stránky v novém okně a spustí tisk (v dialogu jde zvolit "Uložit jako PDF").
 * Každá stránka je samostatný list A4. Vrací false, když okno zablokoval prohlížeč.
 */
export function printPlan(pages: PlanSvg[], title: string): boolean {
  if (pages.length === 0) return false
  const win = window.open('', '_blank')
  if (!win) return false
  const { pageWidth, pageHeight } = pages[0]            // všechny stránky mají stejný formát
  const orientation = pageWidth > pageHeight ? 'landscape' : 'portrait'
  const sheets = pages.map(p => `<div class="sheet">${p.svg}</div>`).join('')
  win.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/</g, '&lt;')}</title>` +
    `<style>@page{size:A4 ${orientation};margin:0}html,body{margin:0;background:#fff}` +
    `.sheet{width:${pageWidth}mm;height:${pageHeight}mm;overflow:hidden;break-after:page;page-break-after:always}` +
    `.sheet:last-child{break-after:auto;page-break-after:auto}` +
    `svg{display:block;width:${pageWidth}mm;height:${pageHeight}mm}</style></head><body>${sheets}</body></html>`,
  )
  win.document.close()
  setTimeout(() => { win.focus(); win.print() }, 300)
  return true
}

/** Stáhne každou stránku jako samostatný SVG soubor. */
export function downloadSvgPages(pages: PlanSvg[], baseName: string) {
  for (const page of pages) {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([page.svg], { type: 'image/svg+xml' }))
    link.download = `${baseName}-${page.kind ?? 'strana'}.svg`
    link.click()
    URL.revokeObjectURL(link.href)
  }
}
