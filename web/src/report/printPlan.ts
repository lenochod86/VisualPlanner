// Tisk a stažení půdorysu (prohlížečové části; samotné sestavení výkresu je v planSvg.ts).
import type { PlanSvg } from './planSvg'

/** Otevře výkres v novém okně a spustí tisk (v dialogu jde zvolit "Uložit jako PDF"). Vrací false, když okno zablokoval prohlížeč. */
export function printPlan(plan: PlanSvg, title: string): boolean {
  const win = window.open('', '_blank')
  if (!win) return false
  const orientation = plan.pageWidth > plan.pageHeight ? 'landscape' : 'portrait'
  win.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/</g, '&lt;')}</title>` +
    `<style>@page{size:A4 ${orientation};margin:0}html,body{margin:0;background:#fff}` +
    `svg{display:block;width:${plan.pageWidth}mm;height:${plan.pageHeight}mm}</style></head><body>${plan.svg}</body></html>`,
  )
  win.document.close()
  setTimeout(() => { win.focus(); win.print() }, 300)
  return true
}

export function downloadSvg(plan: PlanSvg, filename: string) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([plan.svg], { type: 'image/svg+xml' }))
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
