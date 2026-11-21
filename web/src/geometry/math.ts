import { SNAP_STEP } from '../config'

export const snap = (v: number, step = SNAP_STEP) => Math.round(v / step) * step

/** Jako Math.min/max, ale nepadne, když je hi < lo (pak vyhraje lo). */
export const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi))
