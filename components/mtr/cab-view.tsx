'use client'

import { useEffect, useRef } from 'react'
import { type GameState, PLATFORM_LEN, STATIONS, type Station } from '@/lib/mtr/engine'

const SEG = 5
const DRAW_DIST = 260
const W = 2.6
const FLOOR = -1.9
const CEIL = 2.4
const PSD_X = -1.9
const PSD_TOP = 1.3
const HEADER_TOP = 1.9

type RGB = [number, number, number]

function shade(c: RGB, k: number) {
  return `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`
}

function stationAt(worldPos: number): Station | undefined {
  return STATIONS.find((st) => worldPos >= st.pos - PLATFORM_LEN && worldPos <= st.pos + 8)
}

export function CabView({ stateRef }: { stateRef: React.RefObject<GameState> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const render = () => {
      const s = stateRef.current
      if (s) draw(ctx, canvas.width, canvas.height, s)
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [stateRef])

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full"
      role="img"
      aria-label="駕駛室前方視野：隧道及車站月台"
    />
  )
}

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, s: GameState) {
  const f = h * 0.85
  const sway = Math.sin(s.time * 9) * Math.min(s.v, 22) * 0.04 * (h / 600)
  const cx = w / 2
  const cy = h * 0.47 + sway

  const P = (x: number, y: number, z: number): [number, number] => [cx + (x * f) / z, cy - (y * f) / z]

  const quad = (pts: [number, number, number][], fill: string) => {
    ctx.beginPath()
    pts.forEach(([x, y, z], i) => {
      const [sx, sy] = P(x, y, z)
      if (i === 0) ctx.moveTo(sx, sy)
      else ctx.lineTo(sx, sy)
    })
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
  }

  ctx.fillStyle = '#050607'
  ctx.fillRect(0, 0, w, h)

  const base = Math.floor(s.pos / SEG) * SEG
  const count = Math.ceil(DRAW_DIST / SEG)

  for (let k = count; k >= 0; k--) {
    const segStart = base + k * SEG
    let zN = segStart - s.pos
    const zF = zN + SEG
    if (zF <= 0.4) continue
    zN = Math.max(zN, 0.4)

    const fog = Math.max(0, 1 - zN / DRAW_DIST)
    const st = stationAt(segStart + SEG / 2)

    if (!st) {
      const light = 0.22 + 0.15 * fog
      const k2 = fog * light * 1.5
      quad([[-W, FLOOR, zN], [W, FLOOR, zN], [W, FLOOR, zF], [-W, FLOOR, zF]], shade([70, 66, 60], k2))
      quad([[-W, FLOOR, zN], [-W, CEIL, zN], [-W, CEIL, zF], [-W, FLOOR, zF]], shade([92, 92, 90], k2))
      quad([[W, FLOOR, zN], [W, CEIL, zN], [W, CEIL, zF], [W, FLOOR, zF]], shade([86, 86, 84], k2))
      quad([[-W, CEIL, zN], [W, CEIL, zN], [W, CEIL, zF], [-W, CEIL, zF]], shade([50, 50, 50], k2))

      if ((segStart / SEG) % 2 === 0) {
        ctx.strokeStyle = shade([150, 150, 145], fog * 0.35)
        ctx.lineWidth = Math.max(1, (0.05 * f) / zN)
        ctx.beginPath()
        const a = P(-W, FLOOR, zN)
        const b = P(-W, CEIL, zN)
        const c = P(W, CEIL, zN)
        const d = P(W, FLOOR, zN)
        ctx.moveTo(...a)
        ctx.lineTo(...b)
        ctx.lineTo(...c)
        ctx.lineTo(...d)
        ctx.stroke()
      }

      if ((segStart / SEG) % 5 === 0) {
        quad(
          [[W - 0.01, 0.9, zN], [W - 0.01, 1.1, zN], [W - 0.01, 1.1, zN + 1.2], [W - 0.01, 0.9, zN + 1.2]],
          shade([255, 214, 150], 0.4 + 0.6 * fog),
        )
      }
      if ((segStart / SEG) % 8 === 3) {
        quad(
          [[-W + 0.01, 0.2, zN], [-W + 0.01, 0.32, zN], [-W + 0.01, 0.32, zF], [-W + 0.01, 0.2, zF]],
          shade([70, 70, 70], fog),
        )
      }
    } else {
      const k2 = 0.35 + 0.65 * fog
      const tile = st.tile
      quad([[PSD_X, FLOOR, zN], [W, FLOOR, zN], [W, FLOOR, zF], [PSD_X, FLOOR, zF]], shade([78, 74, 68], k2))
      quad([[PSD_X, FLOOR, zN], [PSD_X, -0.8, zN], [PSD_X, -0.8, zF], [PSD_X, FLOOR, zF]], shade([120, 118, 112], k2))
      quad([[PSD_X, -0.8, zN], [PSD_X, -0.68, zN], [PSD_X, -0.68, zF], [PSD_X, -0.8, zF]], shade([232, 196, 40], k2))
      quad([[PSD_X, -0.68, zN], [PSD_X, PSD_TOP, zN], [PSD_X, PSD_TOP, zF], [PSD_X, -0.68, zF]], shade([170, 196, 200], k2 * 0.9))
      quad([[PSD_X, PSD_TOP, zN], [PSD_X, HEADER_TOP, zN], [PSD_X, HEADER_TOP, zF], [PSD_X, PSD_TOP, zF]], shade(tile, k2))
      quad([[PSD_X, HEADER_TOP, zN], [PSD_X, CEIL + 0.6, zN], [PSD_X, CEIL + 0.6, zF], [PSD_X, HEADER_TOP, zF]], shade([210, 208, 200], k2 * 0.8))

      quad([[W, FLOOR, zN], [W, CEIL + 0.6, zN], [W, CEIL + 0.6, zF], [W, FLOOR, zF]], shade(tile, k2 * 0.95))
      quad([[PSD_X, CEIL + 0.6, zN], [W, CEIL + 0.6, zN], [W, CEIL + 0.6, zF], [PSD_X, CEIL + 0.6, zF]], shade([228, 226, 218], k2))
      quad([[-0.6, CEIL + 0.59, zN], [0.6, CEIL + 0.59, zN], [0.6, CEIL + 0.59, zN + 3], [-0.6, CEIL + 0.59, zN + 3]], shade([255, 252, 240], k2))

      ctx.strokeStyle = shade([40, 44, 46], k2)
      ctx.lineWidth = Math.max(1, (0.08 * f) / zN)
      ctx.beginPath()
      ctx.moveTo(...P(PSD_X, -0.68, zN))
      ctx.lineTo(...P(PSD_X, PSD_TOP, zN))
      ctx.stroke()

      const signEvery = 45
      const signLocal = Math.ceil(segStart / signEvery) * signEvery
      if (signLocal >= segStart && signLocal < segStart + SEG && signLocal < st.pos - 10) {
        const z = Math.max(0.6, signLocal - s.pos)
        if (z > 0.6) {
          quad([[W - 0.02, 0.2, z], [W - 0.02, 1.1, z], [W - 0.02, 1.1, z + 3.2], [W - 0.02, 0.2, z + 3.2]], shade([245, 244, 238], k2))
          const [tx, ty] = P(W - 0.02, 0.65, z + 1.6)
          const size = Math.max(6, (0.55 * f) / (z + 1.6))
          ctx.fillStyle = shade([20, 22, 26], k2)
          ctx.font = `700 ${size}px "Noto Sans TC", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.save()
          ctx.translate(tx, ty)
          ctx.scale(0.55, 1)
          ctx.fillText(st.zh, 0, 0)
          ctx.restore()
        }
      }

      const headerLocal = Math.ceil(segStart / 60) * 60
      if (headerLocal >= segStart && headerLocal < segStart + SEG) {
        const z = headerLocal - s.pos
        if (z > 0.6) {
          const [tx, ty] = P(PSD_X, (PSD_TOP + HEADER_TOP) / 2, z + 1.5)
          const size = Math.max(5, (0.42 * f) / (z + 1.5))
          ctx.fillStyle = shade([255, 255, 255], k2)
          ctx.font = `700 ${size}px "Noto Sans TC", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.save()
          ctx.translate(tx, ty)
          ctx.scale(0.5, 1)
          ctx.fillText(st.zh, 0, 0)
          ctx.restore()
        }
      }
    }

    if (zN > 0.5) {
      ctx.strokeStyle = shade([60, 52, 40], fog)
      ctx.lineWidth = Math.max(1, (0.16 * f) / zN)
      ctx.beginPath()
      ctx.moveTo(...P(-0.95, FLOOR, zN))
      ctx.lineTo(...P(0.95, FLOOR, zN))
      ctx.stroke()
    }

    for (const stn of STATIONS) {
      if (stn.pos >= segStart && stn.pos < segStart + SEG) {
        drawStopBoard(ctx, P, f, stn.pos - s.pos, fog)
      }
      const sigPos = stn.pos + 20
      if (sigPos >= segStart && sigPos < segStart + SEG) {
        const isTarget = STATIONS[s.target] === stn
        const isCurrent = STATIONS[s.target - 1] === stn
        const green = isCurrent && !s.doorsOpen && (s.phase === 'ready' || s.phase === 'running')
        const red = isTarget || (isCurrent && s.doorsOpen) || stn === STATIONS[STATIONS.length - 1]
        drawSignal(ctx, P, f, sigPos - s.pos, green && !red, fog)
      }
    }
  }

  ctx.lineCap = 'round'
  for (const rx of [-0.72, 0.72]) {
    const grad = ctx.createLinearGradient(0, h, 0, cy)
    grad.addColorStop(0, '#b9bcc0')
    grad.addColorStop(1, 'rgba(120,124,128,0)')
    ctx.strokeStyle = grad
    ctx.lineWidth = Math.max(1, h / 300)
    ctx.beginPath()
    ctx.moveTo(...P(rx, FLOOR, 0.8))
    ctx.lineTo(...P(rx, FLOOR, DRAW_DIST))
    ctx.stroke()
  }

  const speedBlur = Math.min(1, s.v / 22)
  if (speedBlur > 0.05) {
    const g = ctx.createRadialGradient(cx, cy, h * 0.15, cx, cy, h * 0.9)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, `rgba(0,0,0,${0.45 * speedBlur})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
}

type Proj = (x: number, y: number, z: number) => [number, number]

function drawStopBoard(ctx: CanvasRenderingContext2D, P: Proj, f: number, z: number, fog: number) {
  if (z < 0.8) return
  const [x0, y0] = P(-1.55, 0.9, z)
  const [x1, y1] = P(-1.05, 0.2, z)
  const [px, py] = P(-1.3, -0.68, z)
  ctx.strokeStyle = shade([40, 40, 40], 0.4 + 0.6 * fog)
  ctx.lineWidth = Math.max(1, (0.05 * f) / z)
  ctx.beginPath()
  ctx.moveTo(px, py)
  ctx.lineTo(px, y1)
  ctx.stroke()
  ctx.fillStyle = shade([255, 210, 0], 0.5 + 0.5 * fog)
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
  ctx.fillStyle = '#111'
  ctx.font = `900 ${Math.max(6, (0.36 * f) / z)}px "Noto Sans TC", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('停', (x0 + x1) / 2, (y0 + y1) / 2)
}

function drawSignal(ctx: CanvasRenderingContext2D, P: Proj, f: number, z: number, green: boolean, fog: number) {
  if (z < 1) return
  const [bx, by] = P(1.9, 1.4, z)
  const [ex, ey] = P(2.25, 0.4, z)
  ctx.fillStyle = '#0b0b0b'
  ctx.fillRect(bx, by, ex - bx, ey - by)
  const r = Math.max(2, (0.12 * f) / z)
  const cxp = (bx + ex) / 2
  const color = green ? '#3dff8a' : '#ff3b30'
  const cyp = green ? ey - (ey - by) * 0.28 : by + (ey - by) * 0.28
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur = r * 4 * (0.4 + fog)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(cxp, cyp, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
