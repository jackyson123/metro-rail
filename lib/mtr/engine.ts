export type Station = {
  zh: string
  en: string
  pos: number
  tile: [number, number, number]
}

export type SpeedZone = { start: number; end: number; limit: number }

export const STATIONS: Station[] = [
  { zh: '堅尼地城', en: 'Kennedy Town', pos: 0, tile: [64, 140, 136] },
  { zh: '香港大學', en: 'HKU', pos: 950, tile: [178, 74, 60] },
  { zh: '西營盤', en: 'Sai Ying Pun', pos: 1820, tile: [196, 152, 52] },
  { zh: '上環', en: 'Sheung Wan', pos: 2780, tile: [92, 110, 160] },
  { zh: '中環', en: 'Central', pos: 3700, tile: [52, 128, 80] },
  { zh: '金鐘', en: 'Admiralty', pos: 4560, tile: [44, 96, 170] },
]

export const SPEED_ZONES: SpeedZone[] = [
  { start: 260, end: 560, limit: 60 },
  { start: 2050, end: 2400, limit: 50 },
  { start: 3900, end: 4150, limit: 60 },
]

export const LINE_LIMIT = 80
export const PLATFORM_LEN = 180
export const DWELL_SECONDS = 5
export const STOP_WINDOW_BEHIND = 5
export const STOP_WINDOW_AHEAD = 12

export const NOTCH_MIN = -8
export const NOTCH_MAX = 4

export function notchLabel(n: number) {
  if (n === -8) return 'EB'
  if (n < 0) return `B${-n}`
  if (n === 0) return 'N'
  return `P${n}`
}

export type Phase = 'ready' | 'running' | 'atStation' | 'boarding' | 'finished'

export type StationResult = {
  station: string
  error: number
  accuracy: number
  scheduled: number
  actual: number
  punctuality: number
  penalties: number
  total: number
}

export type Toast = { id: number; text: string; tone: 'info' | 'warn' | 'good'; until: number }

export type GameState = {
  time: number
  pos: number
  v: number
  notch: number
  doorsOpen: boolean
  phase: Phase
  target: number
  dwell: number
  segmentStart: number
  atpTripped: boolean
  wasOverspeed: boolean
  segPenalty: number
  results: StationResult[]
  toasts: Toast[]
  toastId: number
}

export function createState(): GameState {
  return {
    time: 0,
    pos: STATIONS[0].pos,
    v: 0,
    notch: -4,
    doorsOpen: false,
    phase: 'ready',
    target: 1,
    dwell: 0,
    segmentStart: 0,
    atpTripped: false,
    wasOverspeed: false,
    segPenalty: 0,
    results: [],
    toasts: [],
    toastId: 0,
  }
}

export function speedLimitAt(pos: number) {
  for (const z of SPEED_ZONES) if (pos >= z.start && pos <= z.end) return z.limit
  return LINE_LIMIT
}

export function nextZoneAhead(pos: number, within = 250) {
  return SPEED_ZONES.find((z) => z.start > pos && z.start - pos <= within)
}

export function scheduledSeconds(from: number, to: number) {
  return Math.round((STATIONS[to].pos - STATIONS[from].pos) / 12.5 + 10)
}

export function kmh(v: number) {
  return v * 3.6
}

function pushToast(s: GameState, text: string, tone: Toast['tone'] = 'info', secs = 3) {
  if (s.toasts.some((t) => t.text === text && t.until > s.time)) return
  s.toastId += 1
  s.toasts = [...s.toasts.filter((t) => t.until > s.time), { id: s.toastId, text, tone, until: s.time + secs }].slice(-3)
}

function acceleration(s: GameState) {
  const { notch, v } = s
  let a = 0
  if (s.atpTripped || notch === NOTCH_MIN) a = -1.35
  else if (notch < 0) a = notch * 0.15
  else if (notch > 0 && !s.doorsOpen) {
    const base = [0, 0.3, 0.55, 0.8, 1.0][notch]
    a = base * (v < 11 ? 1 : Math.pow(11 / v, 0.8))
  }
  const resistance = v > 0 ? 0.006 + 0.00012 * v * v : 0
  return a - resistance
}

export function setNotch(s: GameState, n: number) {
  const next = Math.max(NOTCH_MIN, Math.min(NOTCH_MAX, n))
  if (next === s.notch) return
  if (next > 0 && s.doorsOpen) {
    pushToast(s, '車門未關，無法加力！請先按 C 關門', 'warn')
  }
  if (next === NOTCH_MIN && s.v > 1 && s.notch !== NOTCH_MIN) {
    s.segPenalty += 5
    pushToast(s, '已使用緊急制動 (−5 分)', 'warn')
  }
  s.notch = next
  if (s.atpTripped && s.v === 0 && next < 0) {
    s.atpTripped = false
    pushToast(s, 'ATP 已復位，可以重新開車', 'good')
  }
}

export function openDoors(s: GameState) {
  if (s.phase === 'finished' || s.doorsOpen) return
  if (s.v > 0.01) return pushToast(s, '列車仍在行駛，不可開門！', 'warn')
  if (s.phase === 'ready') return pushToast(s, '已完成上落，請開往下一站', 'info')
  const stop = STATIONS[s.target].pos
  const err = s.pos - stop
  if (err < -STOP_WINDOW_BEHIND) {
    return pushToast(s, `未到停車位置（尚差 ${Math.abs(err).toFixed(1)} 米），請以 P1 慢速前進`, 'warn')
  }
  if (s.notch >= 0) return pushToast(s, '開門前請先將主控制器置於制動位置 (B)', 'warn')

  s.doorsOpen = true
  s.phase = 'boarding'
  s.dwell = DWELL_SECONDS

  const absErr = Math.abs(err)
  const accuracy = err > STOP_WINDOW_AHEAD ? 0 : absErr <= 0.5 ? 50 : Math.max(0, Math.round(50 - (absErr - 0.5) * 6))
  const scheduled = scheduledSeconds(s.target - 1, s.target)
  const actual = Math.round(s.time - s.segmentStart)
  const late = actual - scheduled
  const punctuality = late <= 5 ? 30 : Math.max(0, 30 - (late - 5) * 2)
  const total = Math.max(0, accuracy + punctuality - s.segPenalty)
  s.results = [
    ...s.results,
    {
      station: STATIONS[s.target].zh,
      error: err,
      accuracy,
      scheduled,
      actual,
      punctuality,
      penalties: s.segPenalty,
      total,
    },
  ]
  const verdict = absErr <= 0.5 ? '完美對位！' : absErr <= 2 ? '對位良好' : err > 0 ? '停車越位' : '停車未到位'
  pushToast(s, `${STATIONS[s.target].zh}站 · ${verdict}（誤差 ${err >= 0 ? '+' : ''}${err.toFixed(1)} 米）`, absErr <= 2 ? 'good' : 'warn', 4)
}

export function closeDoors(s: GameState) {
  if (!s.doorsOpen) return
  if (s.dwell > 0) return pushToast(s, `乘客仍在上落，請稍候 ${Math.ceil(s.dwell)} 秒`, 'info')
  s.doorsOpen = false
  if (s.target >= STATIONS.length - 1) {
    s.phase = 'finished'
    return
  }
  s.target += 1
  s.phase = 'ready'
  s.segPenalty = 0
  s.segmentStart = s.time
  pushToast(s, `車門已關，下一站：${STATIONS[s.target].zh}`, 'good')
}

export function step(s: GameState, dt: number) {
  if (s.phase === 'finished') return
  s.time += dt

  if (s.phase === 'boarding') s.dwell = Math.max(0, s.dwell - dt)

  const a = acceleration(s)
  s.v = Math.max(0, s.v + a * dt)
  s.pos += s.v * dt

  if (s.phase === 'ready' && s.v > 0.1) {
    s.phase = 'running'
    if (s.segmentStart === 0 && s.target === 1) s.segmentStart = s.time
  }

  const limit = speedLimitAt(s.pos)
  const speed = kmh(s.v)
  if (speed > limit + 0.5) {
    if (!s.wasOverspeed) {
      s.wasOverspeed = true
      s.segPenalty += 5
      pushToast(s, `超速！限速 ${limit} km/h (−5 分)`, 'warn')
    }
    if (speed > limit + 5 && !s.atpTripped) {
      s.atpTripped = true
      s.segPenalty += 15
      pushToast(s, 'ATP 啟動緊急制動！停車後將主控制器置於 B 位復位 (−15 分)', 'warn', 5)
    }
  } else if (speed < limit - 1) {
    s.wasOverspeed = false
  }

  if (s.atpTripped && s.v === 0 && s.notch < 0) {
    s.atpTripped = false
    pushToast(s, 'ATP 已復位，可以重新開車', 'good')
  }

  if (s.phase === 'running' && s.v === 0) {
    const err = s.pos - STATIONS[s.target].pos
    if (err >= -STOP_WINDOW_BEHIND) s.phase = 'atStation'
  }
  if (s.phase === 'atStation' && s.v > 0.1) s.phase = 'running'
}

export type Hint = { title: string; body: string }

export function currentHint(
  s: Pick<GameState, 'phase' | 'target' | 'pos' | 'v' | 'atpTripped' | 'dwell' | 'notch'>,
): Hint {
  if (s.phase === 'finished') return { title: '行程完成', body: '辛苦晒！查看你的駕駛成績。' }
  const stop = STATIONS[s.target].pos
  const dist = stop - s.pos
  const speed = kmh(s.v)

  if (s.atpTripped) return { title: 'ATP 緊急制動中', body: '列車停定後，將主控制器置於任何 B 檔即可復位。' }

  if (s.phase === 'boarding') {
    return s.dwell > 0
      ? { title: '乘客上落中', body: `請等候乘客上落（${Math.ceil(s.dwell)} 秒）。` }
      : { title: '可以關門', body: '乘客上落完畢，按 C 或「關門」按鈕關上車門。' }
  }
  if (s.phase === 'atStation') {
    if (dist > STOP_WINDOW_BEHIND) return { title: '未到停車位置', body: '按 ↑ 推至 P1 慢速前進，再用 B1 停定。' }
    if (s.notch >= 0) return { title: '保持制動', body: '將主控制器置於 B 檔，然後按 O 開門。' }
    return { title: '列車已停定', body: '按 O 或「開門」按鈕打開車門讓乘客上落。' }
  }
  if (s.phase === 'ready') {
    return {
      title: `開往 ${STATIONS[s.target].zh}`,
      body: '出發訊號已轉綠。按 ↑ / W 將主控制器推至 P 檔，列車便會開出。',
    }
  }

  const brakeDist = (s.v * s.v) / (2 * 0.6)
  if (dist < -STOP_WINDOW_BEHIND) return { title: '已越過停車位置', body: '立即制動停車，然後開門。是次對位將不獲分數。' }
  if (dist < 40 && s.v > 0.5) return { title: '準備對位', body: '逐步減至 B1–B2，令列車剛好停在「停」字停車牌前。' }
  if (dist < brakeDist + 60 && speed > 15) {
    return { title: `即將到達 ${STATIONS[s.target].zh}`, body: '開始減速！建議使用 B3–B5 制動，觀察「距離停車位置」數字。' }
  }
  const zone = nextZoneAhead(s.pos)
  if (zone && speed > zone.limit) {
    return { title: `前方限速 ${zone.limit} km/h`, body: `${Math.round(zone.start - s.pos)} 米後進入彎道限速區，請提早制動減速。` }
  }
  if (speed > speedLimitAt(s.pos) - 3) return { title: '接近限速', body: '將主控制器拉回 N（惰行）保持速度，避免超速。' }
  return { title: '行車中', body: '加速至接近限速後回 N 惰行，留意前方限速及車站距離。' }
}
