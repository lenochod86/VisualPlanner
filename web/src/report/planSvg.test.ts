import { describe, expect, it } from 'vitest'
import { DEFAULT_CEILING } from '../domain/materials'
import type { Project } from '../domain/types'
import { shapePts } from '../geometry/shapes'
import { buildPlanSvg, pickScale, type PlanSvgOptions } from './planSvg'

const options: PlanSvgOptions = { dimensions: true, furniture: true, electro: false, title: 'Můj byt', date: '1. 1. 2027' }

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
    electric: [], cables: [],
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

describe('buildPlanSvg', () => {
  it('obsahuje názvy místností, plochu, kóty a razítko', () => {
    const { svg, scale } = buildPlanSvg(project(), options)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true)
    expect(svg).toContain('Obývák')
    expect(svg).toContain('15,8 m²')                     // 4,5 × 3,5 m
    expect(svg).toContain('>450<')                       // délka stěny
    expect(svg).toContain(`Měřítko 1:${scale}`)
    expect(svg).toContain('Můj byt')
  })

  it('kóty a nábytek jdou vypnout', () => {
    const { svg } = buildPlanSvg(project(), { ...options, dimensions: false, furniture: false })
    expect(svg).not.toContain('>450<')
    expect(svg).not.toContain('Gauč')
    expect(buildPlanSvg(project(), options).svg).toContain('Gauč')
  })

  it('okno a dveře mají značku (křídlo a oblouk dveří)', () => {
    const { svg } = buildPlanSvg(project(), options)
    expect(svg).toMatch(/ A90 90 0 0 1 /)                // oblouk dveří o poloměru = šířka dveří
  })

  it('názvy se escapují, SVG zůstane správně uzavřené', () => {
    const { svg } = buildPlanSvg(project('Koupelna <&> "x"'), options)
    expect(svg).toContain('Koupelna &lt;&amp;&gt; &quot;x&quot;')
    expect((svg.match(/<g[ >]/g) ?? []).length).toBe((svg.match(/<\/g>/g) ?? []).length)
  })

  it('malý byt se vejde do A4 na šířku, vysoký na výšku', () => {
    expect(buildPlanSvg(project(), options)).toMatchObject({ pageWidth: 297, pageHeight: 210 })
    const tall = project()
    tall.rooms[0].pts = shapePts('rect', 0, 0, 300, 700)
    expect(buildPlanSvg(tall, options)).toMatchObject({ pageWidth: 210, pageHeight: 297 })
  })
})

describe('otvor v tisku', () => {
  it('otvor má špalety a žádný oblouk dveří', () => {
    const p = project()
    p.obstacles = [{ id: 'o', roomId: 'a', kind: 'opening', w: 100, d: 12, h: 205, elev: 0, x: 0, y: 0, rot: 0, attach: { edge: 0, along: 200 } }]
    const { svg } = buildPlanSvg(p, options)
    expect(svg).not.toMatch(/ A\d+ \d+ 0 0 1 /)
  })
})
