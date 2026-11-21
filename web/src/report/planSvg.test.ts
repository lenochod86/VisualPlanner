import { describe, expect, it } from 'vitest'
import { DEFAULT_CEILING } from '../domain/materials'
import type { Project } from '../domain/types'
import { shapePts } from '../geometry/shapes'
import { availablePages, buildPlanPages, buildPlanSvg, PAGES, pickScale, type PlanSvgOptions } from './planSvg'

const options = (kind: keyof typeof PAGES = 'plan'): PlanSvgOptions =>
  ({ layers: PAGES[kind].layers, title: 'Můj byt', date: '1. 1. 2027' })

const project = (name = 'Obývák'): Project => {
  const pts = shapePts('rect', 0, 0, 450, 350)
  return {
    rooms: [{
      id: 'a', name, type: 'living', pts, walls: [10, 10, 10, 10], height: 260,
      wallMaterials: ['plaster', 'plaster', 'plaster', 'plaster'], wallModes: ['auto', 'auto', 'auto', 'auto'], ceiling: { ...DEFAULT_CEILING },
    }],
    obstacles: [
      { id: 'w', roomId: 'a', kind: 'window', w: 120, d: 12, h: 140, elev: 90, x: 0, y: 0, rot: 0, attach: { edge: 0, along: 200 } },
      { id: 'd', roomId: 'a', kind: 'door', w: 90, d: 12, h: 205, elev: 0, x: 0, y: 0, rot: 0, attach: { edge: 2, along: 100 } },
    ],
    furniture: [{ id: 'f', roomId: 'a', kind: 'sofa', w: 200, d: 90, h: 85, elev: 0, x: 0, y: 0, rot: 0, attach: { edge: 3, along: 150 } }],
    electric: [{ id: 'p', roomId: 'a', kind: 'socket', name: '', x: 0, y: 0, height: 30, attach: { edge: 0, along: 100 } }],
    cables: [],
  }
}

describe('pickScale', () => {
  it('vybere nejdetailnější měřítko, do kterého se byt vejde', () => {
    expect(pickScale(400, 300, 250, 150)).toBe(20)       // 400 cm = 200 mm při 1:20
    expect(pickScale(1500, 900, 250, 150)).toBe(75)      // 1:50 je 300 mm = moc
  })
  it('pro obrovský objekt zvolí vyšší násobek 50', () => {
    expect(pickScale(50000, 50000, 250, 150)).toBe(3350)
  })
})

describe('stránka Půdorys', () => {
  it('má názvy místností, plochu, kóty a razítko, ale ne nábytek ani elektro', () => {
    const { svg, scale } = buildPlanSvg(project(), options('plan'))
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true)
    expect(svg).toContain('Obývák')
    expect(svg).toContain('15,8 m²')                     // 4,5 × 3,5 m
    expect(svg).toContain('>450<')                       // délka stěny
    expect(svg).toContain(`Měřítko 1:${scale}`)
    expect(svg).toContain('Můj byt')
    expect(svg).not.toContain('Gauč')
    expect(svg).not.toContain('<polyline')
  })

  it('okno a dveře mají značku (oblouk dveří o poloměru = šířka dveří)', () => {
    expect(buildPlanSvg(project(), options('plan')).svg).toMatch(/ A90 90 0 0 1 /)
  })

  it('názvy se escapují, SVG zůstane správně uzavřené', () => {
    const { svg } = buildPlanSvg(project('Koupelna <&> "x"'), options('plan'))
    expect(svg).toContain('Koupelna &lt;&amp;&gt; &quot;x&quot;')
    expect((svg.match(/<g[ >]/g) ?? []).length).toBe((svg.match(/<\/g>/g) ?? []).length)
  })
})

describe('stránka Vybavení', () => {
  it('má nábytek s názvem, ale bez názvů místností a bez kót stěn', () => {
    const { svg } = buildPlanSvg(project(), options('equipment'))
    expect(svg).toContain('Gauč')
    expect(svg).not.toContain('Obývák')                  // název místnosti
    expect(svg.match(/15,8 m²/g)).toHaveLength(1)        // plocha jen v razítku (užitná plocha), ne u místnosti
    expect(svg).not.toContain('>450<')                   // kóta stěny
  })
})

describe('stránka Elektro', () => {
  it('má elektro body, slabé obrysy nábytku bez názvů a bez kót stěn', () => {
    const { svg } = buildPlanSvg(project(), options('electro'))
    expect(svg).toContain('<circle')                     // zásuvka
    expect(svg).not.toContain('Gauč')                    // nábytek jen jako obrys
    expect(svg).toContain('stroke="#aaa"')
    expect(svg).not.toContain('>450<')
  })
})

describe('více stránek', () => {
  it('nabídne jen stránky, které mají co ukázat', () => {
    expect(availablePages({ furniture: [], electric: [], cables: [] })).toEqual(['plan'])
    expect(availablePages(project())).toEqual(['plan', 'equipment', 'electro'])
  })

  it('všechny stránky mají stejný formát, měřítko a výkres na stejném místě', () => {
    const pages = buildPlanPages(project(), { title: 'Byt', date: 'dnes' }, ['plan', 'equipment', 'electro'])
    expect(pages.map(p => p.kind)).toEqual(['plan', 'equipment', 'electro'])
    expect(new Set(pages.map(p => `${p.pageWidth}x${p.pageHeight}@${p.scale}`)).size).toBe(1)
    const transform = (svg: string) => svg.match(/<g transform="translate\([^"]+\)/)![0]
    expect(new Set(pages.map(p => transform(p.svg))).size).toBe(1)
    expect(pages[1].svg).toContain('Byt - Vybavení')
  })

  it('malý byt se vejde do A4 na šířku, vysoký na výšku', () => {
    expect(buildPlanSvg(project(), options())).toMatchObject({ pageWidth: 297, pageHeight: 210 })
    const tall = project()
    tall.rooms[0].pts = shapePts('rect', 0, 0, 300, 700)
    expect(buildPlanSvg(tall, options())).toMatchObject({ pageWidth: 210, pageHeight: 297 })
  })
})

describe('otvor a dveře v tisku', () => {
  it('otvor má špalety a žádný oblouk dveří', () => {
    const p = project()
    p.obstacles = [{ id: 'o', roomId: 'a', kind: 'opening', w: 100, d: 12, h: 205, elev: 0, x: 0, y: 0, rot: 0, attach: { edge: 0, along: 200 } }]
    expect(buildPlanSvg(p, options()).svg).not.toMatch(/ A\d+ \d+ 0 0 1 /)
  })

  it('strana závěsů mění směr oblouku', () => {
    const arc = (patch: object) => {
      const p = project()
      p.obstacles = [{ id: 'd', roomId: 'a', kind: 'door', w: 90, d: 12, h: 205, elev: 0, x: 0, y: 0, rot: 0, attach: { edge: 0, along: 200 }, ...patch }]
      return buildPlanSvg(p, options()).svg.match(/ A90 90 0 0 (\d) /)?.[1]
    }
    expect(arc({ hinge: 'right' })).not.toBe(arc({ hinge: 'left' }))
  })
})
