'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DoorClosed, DoorOpen, Minus, OctagonAlert, Plus, RotateCcw, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  type GameState,
  STATIONS,
  closeDoors,
  createState,
  currentHint,
  kmh,
  nextZoneAhead,
  notchLabel,
  openDoors,
  scheduledSeconds,
  setNotch,
  speedLimitAt,
  step,
} from '@/lib/mtr/engine'
import dynamic from 'next/dynamic'
import { CAMERA_MODES, type CameraMode } from './scene/camera-rig'
import { GuidePanel } from './guide-panel'
import { LineMap } from './line-map'
import { NotchLever } from './notch-lever'
import { ResultScreen } from './result-screen'
import { Speedometer } from './speedometer'
import { cn } from '@/lib/utils'
import { ROLLING_STOCK, type RollingStock } from '@/lib/mtr/rolling-stock'

const RailScene = dynamic(() => import('./scene/rail-scene').then((m) => m.RailScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">正在載入 3D 路綫場景…</div>
  ),
})

type Snapshot = Pick<
  GameState,
  'pos' | 'v' | 'notch' | 'doorsOpen' | 'phase' | 'target' | 'dwell' | 'time' | 'segmentStart' | 'atpTripped' | 'toasts' | 'results' | 'weather' | 'dayPhase' | 'activeEvent'
>

function snap(s: GameState): Snapshot {
  return {
    pos: s.pos,
    v: s.v,
    notch: s.notch,
    doorsOpen: s.doorsOpen,
    phase: s.phase,
    target: s.target,
    dwell: s.dwell,
    time: s.time,
    segmentStart: s.segmentStart,
    atpTripped: s.atpTripped,
    toasts: s.toasts,
    results: s.results,
    weather: s.weather,
    dayPhase: s.dayPhase,
    activeEvent: s.activeEvent,
  }
}

export function Game() {
  const stateRef = useRef<GameState>(createState())
  const [started, setStarted] = useState(false)
  const [view, setView] = useState<Snapshot>(() => snap(stateRef.current))
  const [camMode, setCamMode] = useState<CameraMode>('cab')
  const [rollingStockId, setRollingStockId] = useState<RollingStock['id']>('urban')
  const audioRef = useRef<AudioContext | null>(null)
  const previousDoor = useRef(false)
  const previousSpeed = useRef(0)
  const [hornPulse, setHornPulse] = useState(0)

  useEffect(() => {
    if (!started) return
    const stock = ROLLING_STOCK.find((item) => item.id === rollingStockId) ?? ROLLING_STOCK[0]
    const sound = (kind: 'door' | 'motor' | 'bell' | 'horn') => {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtor) return
      const ctx = audioRef.current ?? new AudioCtor()
      audioRef.current = ctx
      if (ctx.state === 'suspended') void ctx.resume()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = kind === 'motor' ? 'sawtooth' : kind === 'horn' ? 'square' : 'sine'
      osc.frequency.value = kind === 'door' ? 180 : kind === 'bell' ? 880 : kind === 'horn' ? 520 : stock.motorHz
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(kind === 'motor' ? 0.025 : kind === 'horn' ? 0.09 : 0.07, ctx.currentTime + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (kind === 'motor' ? 0.22 : kind === 'horn' ? 0.6 : 0.42))
      osc.connect(gain).connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.65)
    }
    const s = stateRef.current
    if (s.doorsOpen !== previousDoor.current) {
      sound('door')
      if (s.doorsOpen) sound('bell')
      else {
        sound('bell')
        window.setTimeout(() => sound('bell'), 260)
        window.setTimeout(() => sound('bell'), 520)
      }
      previousDoor.current = s.doorsOpen
    }
    if (s.v > 0.7 && previousSpeed.current <= 0.7) sound('motor')
    previousSpeed.current = s.v
    if (hornPulse > 0) sound('horn')
  }, [started, view.time, hornPulse, rollingStockId])

  useEffect(() => {
    if (!started) return
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      step(stateRef.current, dt)
      setView(snap(stateRef.current))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [started])

  const act = useCallback((fn: (s: GameState) => void) => {
    fn(stateRef.current)
    setView(snap(stateRef.current))
  }, [])

  useEffect(() => {
    if (!started) return
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const s = stateRef.current
      if (k === 'arrowup' || k === 'w') act(() => setNotch(s, s.notch + 1))
      else if (k === 'arrowdown' || k === 's') act(() => setNotch(s, s.notch - 1))
      else if (k === 'n') act(() => setNotch(s, 0))
      else if (k === ' ') act(() => setNotch(s, -8))
      else if (k === 'o') act(() => openDoors(s))
      else if (k === 'c') act(() => closeDoors(s))
      else if (k === 'h') setHornPulse((p) => p + 1)
      else if (k === 'v')
        setCamMode((m) => CAMERA_MODES[(CAMERA_MODES.findIndex((c) => c.id === m) + 1) % CAMERA_MODES.length].id)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [started, act])

  const restart = () => {
    stateRef.current = createState()
    setView(snap(stateRef.current))
    setStarted(true)
  }

  const speed = kmh(view.v)
  const limit = speedLimitAt(view.pos)
  const zone = nextZoneAhead(view.pos)
  const targetStation = STATIONS[view.target]
  const dist = targetStation.pos - view.pos
  const hint = currentHint(view)
  const elapsed = Math.max(0, view.time - view.segmentStart)
  const scheduled = scheduledSeconds(view.target - 1, view.target)
  const score = view.results.reduce((a, r) => a + r.total, 0)
  const activeToasts = view.toasts.filter((t) => t.until > view.time)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-3 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 items-center rounded-md bg-line px-3 text-sm font-bold text-primary-foreground">港島綫</div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight text-balance md:text-xl">港鐵模擬駕駛</h1>
            <span className="text-xs text-muted-foreground">MTR Driver Simulator · Island Line</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <label className="flex items-center gap-2 rounded-md border border-border bg-cab px-2.5 py-1.5 text-xs">
            <span className="text-muted-foreground">列車型號</span>
            <select
              value={rollingStockId}
              onChange={(event) => setRollingStockId(event.target.value as RollingStock['id'])}
              className="bg-transparent font-bold outline-none"
              aria-label="選擇列車型號"
            >
              {ROLLING_STOCK.map((stock) => <option key={stock.id} value={stock.id}>{stock.name}</option>)}
            </select>
          </label>
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground">總分</span>
            <span className="font-mono text-xl font-bold tabular-nums text-accent">{score}</span>
          </div>
          <Button variant="outline" size="sm" onClick={restart}>
            <RotateCcw aria-hidden="true" />
            重新開始
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border-8 border-cab bg-background shadow-2xl md:aspect-[16/8]">
            <RailScene stateRef={stateRef} mode={camMode} rollingStockId={rollingStockId} />

            <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between gap-2 p-3">
              <div className="flex flex-col items-start gap-2">
                <div className="rounded-md bg-background/80 px-3 py-2 backdrop-blur">
                  <div className="text-[11px] text-muted-foreground">下一站 Next</div>
                  <div className="font-bold">
                    {targetStation.zh} <span className="text-xs font-normal text-muted-foreground">{targetStation.en}</span>
                  </div>
                </div>
                <div
                  role="radiogroup"
                  aria-label="鏡頭視角（按 V 切換）"
                  className="pointer-events-auto flex rounded-md bg-background/80 p-1 backdrop-blur"
                >
                  {CAMERA_MODES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={camMode === c.id}
                      onClick={() => setCamMode(c.id)}
                      className={cn(
                        'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                        camMode === c.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5" aria-live="polite">
                <div className="flex gap-2 text-xs font-bold">
                  <span className={cn('rounded-md px-2 py-1 backdrop-blur', view.weather === 'rain' ? 'bg-sky-900/80 text-sky-100' : 'bg-emerald-900/75 text-emerald-100')}>{view.weather === 'rain' ? '雨天 · 濕滑路軌' : '晴天'}</span>
                  <span className="rounded-md bg-background/80 px-2 py-1 backdrop-blur">{view.activeEvent ? `事件：${view.activeEvent.label}` : '營運正常'}</span>
                </div>
                {activeToasts.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      'max-w-xs rounded-md px-3 py-1.5 text-sm font-medium shadow animate-in fade-in slide-in-from-top-2',
                      t.tone === 'warn' && 'bg-primary text-primary-foreground',
                      t.tone === 'good' && 'bg-accent text-accent-foreground',
                      t.tone === 'info' && 'bg-foreground text-background',
                    )}
                  >
                    {t.text}
                  </div>
                ))}
              </div>
            </div>

            {started && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
                <div className="mx-auto max-w-xl rounded-md border border-accent/40 bg-background/85 px-4 py-2.5 backdrop-blur">
                  <div className="flex items-center gap-2 text-sm font-bold text-accent">
                    <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
                    提示：{hint.title}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">{hint.body}</p>
                </div>
              </div>
            )}

            {!started && <IntroOverlay onStart={() => setStarted(true)} />}
            {view.phase === 'finished' && <ResultScreen results={view.results} onRestart={restart} />}
          </div>

          <LineMap pos={view.pos} target={view.target} />

          <section aria-label="駕駛台" className="relative grid gap-4 overflow-hidden rounded-xl border border-cab-edge bg-cab p-4 shadow-[0_14px_40px_rgba(15,23,42,0.16)] sm:grid-cols-[auto_1fr_auto]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-line via-accent to-line" />
            <div className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full bg-accent/10 blur-3xl" />
            <div className="flex justify-center">
              <Speedometer speed={speed} limit={limit} />
            </div>

            <div className="grid min-w-0 grid-cols-2 content-start gap-2 md:grid-cols-3">
              <Readout label="距離停車位置" value={`${dist >= 0 ? '' : '+'}${Math.abs(dist) >= 100 ? Math.round(Math.abs(dist)) : Math.abs(dist).toFixed(1)}`} unit="米" warn={dist < -5} />
              <Readout label="限速" value={`${limit}`} unit="km/h" warn={speed > limit + 0.5} />
              <Readout label="前方限速" value={zone ? `${zone.limit}` : '—'} unit={zone ? `${Math.round(zone.start - view.pos)} 米後` : ''} />
              <Readout label="主控制器" value={notchLabel(view.notch)} warn={view.notch === -8 || view.atpTripped} />
              <Readout label="行車時間 / 預定" value={`${Math.round(elapsed)} / ${scheduled}`} unit="秒" warn={elapsed > scheduled + 5} />
              <Readout
                label="車門"
                value={view.doorsOpen ? '開啟' : '關閉'}
                unit={view.phase === 'boarding' && view.dwell > 0 ? `上落中 ${Math.ceil(view.dwell)}s` : ''}
                warn={view.doorsOpen}
              />
              <div className="col-span-2 flex flex-wrap gap-2 pt-1 md:col-span-3">
                <Button variant="secondary" onClick={() => act((s) => setNotch(s, s.notch - 1))} disabled={!started} aria-label="制動（向 B 拉）">
                  <Minus aria-hidden="true" />
                  制動
                </Button>
                <Button variant="secondary" onClick={() => act((s) => setNotch(s, s.notch + 1))} disabled={!started} aria-label="加力（向 P 推）">
                  <Plus aria-hidden="true" />
                  加力
                </Button>
                <Button variant="destructive" onClick={() => act((s) => setNotch(s, -8))} disabled={!started}>
                  <OctagonAlert aria-hidden="true" />
                  緊急制動
                </Button>
                <Button variant="outline" onClick={() => act(openDoors)} disabled={!started}>
                  <DoorOpen aria-hidden="true" />
                  開門 (O)
                </Button>
                <Button variant="outline" onClick={() => act(closeDoors)} disabled={!started}>
                  <DoorClosed aria-hidden="true" />
                  關門 (C)
                </Button>
                <Button variant="outline" onClick={() => setHornPulse((p) => p + 1)} disabled={!started}>
                  <Volume2 aria-hidden="true" />
                  鳴笛 (H)
                </Button>
              </div>
            </div>

            <div className="flex justify-center">
              <NotchLever notch={view.notch} onChange={(n) => started && act((s) => setNotch(s, n))} />
            </div>
          </section>
        </div>

        <GuidePanel />
      </div>
    </div>
  )
}

function Readout({ label, value, unit, warn }: { label: string; value: string; unit?: string; warn?: boolean }) {
  return (
    <div className={cn('flex flex-col rounded-md border border-border bg-background px-3 py-2', warn && 'border-primary')}>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className={cn('font-mono text-xl font-bold tabular-nums', warn ? 'text-primary' : 'text-accent')}>{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </span>
    </div>
  )
}

function IntroOverlay({ onStart }: { onStart: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm">
      <div className="flex max-w-lg flex-col gap-4 text-center">
        <p className="text-sm font-bold text-accent">港島綫 · 堅尼地城 → 金鐘</p>
        <h2 className="text-2xl font-bold text-balance md:text-4xl">今日由你揸車</h2>
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground md:text-base">
          你係港鐵車長，要準時、安全咁將列車駛經五個車站。每站都要準確停喺黃色「停」字停車牌前，開門俾乘客上落，再關門開車。
        </p>
        <div className="flex justify-center">
          <Button size="lg" onClick={onStart}>
            開始駕駛
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">提示：用 ↑ ↓ ��操控主控制器，O 開門、C 關門。右邊有詳細駕駛須知。</p>
      </div>
    </div>
  )
}
