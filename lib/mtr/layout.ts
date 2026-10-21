import { STATIONS, type Station } from './engine'

export const SEG = 6
export const VIEW_BEHIND = 230
export const VIEW_AHEAD = 430

export const TUNNEL_R = 2.75
export const TUNNEL_CY = 1.9

export const CAR_LEN = 22
export const CAR_GAP = 0.8
export const CARS = 8
export const TRAIN_LEN = CARS * CAR_LEN + (CARS - 1) * CAR_GAP
export const DOOR_OFFSETS = [2.5, 6.75, 11, 15.25, 19.5]
export const BODY_W = 3.1
export const BODY_H = 3.15
export const BODY_Y = 0.95

export const PLATFORM_Y = 1.1
export const PLATFORM_EDGE_X = -1.62
export const PSD_X = -1.95
export const TRACK_WALL_X = 2.9
export const STATION_CEIL = 5.6
export const PLATFORM_CEIL = 4.4
export const PLATFORM_FAR_X = -12

export const PSD_START = -2
export const PSD_END = TRAIN_LEN + 2
export const PSD_OPEN_W = 2.1
export const PSD_TOP = 3.25

export const DOOR_CENTERS: number[] = Array.from({ length: CARS }, (_, i) =>
  DOOR_OFFSETS.map((o) => i * (CAR_LEN + CAR_GAP) + o),
).flat()

export const PSD_PANELS: [number, number][] = (() => {
  const out: [number, number][] = []
  let cursor = PSD_START
  for (const c of DOOR_CENTERS) {
    const a = c - PSD_OPEN_W / 2
    if (a > cursor) out.push([cursor, a])
    cursor = c + PSD_OPEN_W / 2
  }
  if (cursor < PSD_END) out.push([cursor, PSD_END])
  return out
})()

export type StationBox = { st: Station; index: number; start: number; end: number }

export const STATION_BOXES: StationBox[] = STATIONS.map((st, index) => ({
  st,
  index,
  start: Math.floor((st.pos - TRAIN_LEN - 14) / SEG) * SEG,
  end: Math.ceil((st.pos + 30) / SEG) * SEG,
}))

export function inStation(p: number) {
  for (const b of STATION_BOXES) if (p > b.start && p < b.end) return true
  return false
}

export function stationProximity(p: number) {
  let best = Number.POSITIVE_INFINITY
  let box = STATION_BOXES[0]
  for (const b of STATION_BOXES) {
    const d = p < b.start ? b.start - p : p > b.end ? p - b.end : 0
    if (d < best) {
      best = d
      box = b
    }
  }
  return { box, distance: best, factor: Math.max(0, 1 - best / 45) }
}
