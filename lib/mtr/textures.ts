import * as THREE from 'three'

type RGB = [number, number, number]
type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number) => void

const cache = new Map<string, THREE.CanvasTexture>()

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export function makeTexture(
  key: string,
  w: number,
  h: number,
  draw: Draw,
  { repeat = [1, 1], srgb = true }: { repeat?: [number, number]; srgb?: boolean } = {},
) {
  const full = `${key}|${repeat[0].toFixed(3)}x${repeat[1].toFixed(3)}`
  const hit = cache.get(full)
  if (hit) return hit
  const base = cache.get(key)
  let tex: THREE.CanvasTexture
  if (base) {
    tex = base.clone()
    tex.needsUpdate = true
  } else {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('2D canvas unavailable')
    draw(ctx, w, h, rng(hash(key)))
    tex = new THREE.CanvasTexture(c)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.anisotropy = 8
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace
    cache.set(key, tex)
  }
  tex.repeat.set(repeat[0], repeat[1])
  cache.set(full, tex)
  return tex
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, rgb: RGB, amp: number, rnd: () => number) {
  const img = ctx.createImageData(w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * amp
    d[i] = rgb[0] + n
    d[i + 1] = rgb[1] + n
    d[i + 2] = rgb[2] + n
    d[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
}

function wrapped(w: number, h: number, fn: (dx: number, dy: number) => void) {
  for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) fn(dx, dy)
}

function blotches(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rnd: () => number,
  count: number,
  rgb: RGB,
  maxR: number,
  alpha: number,
) {
  for (let i = 0; i < count; i++) {
    const x = rnd() * w
    const y = rnd() * h
    const r = maxR * (0.3 + rnd() * 0.7)
    const a = alpha * (0.4 + rnd() * 0.6)
    wrapped(w, h, (dx, dy) => {
      const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r)
      g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`)
      g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`)
      ctx.fillStyle = g
      ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2)
    })
  }
}

export function concreteTexture(repeat: [number, number]) {
  return makeTexture(
    'tunnel-concrete',
    512,
    512,
    (ctx, w, h, rnd) => {
      grain(ctx, w, h, [116, 113, 106], 24, rnd)
      blotches(ctx, w, h, rnd, 45, [42, 40, 36], 110, 0.16)
      blotches(ctx, w, h, rnd, 30, [168, 164, 152], 80, 0.1)
      for (let i = 0; i < 18; i++) {
        ctx.fillStyle = `rgba(34,30,26,${0.04 + rnd() * 0.08})`
        ctx.fillRect(0, rnd() * h, w, 2 + rnd() * 10)
      }
      ctx.fillStyle = '#26241f'
      ctx.fillRect(0, 0, w, 5)
      ctx.fillStyle = 'rgba(210,205,192,0.25)'
      ctx.fillRect(0, 5, w, 2)
      for (const x of [0, w / 3, (2 * w) / 3]) {
        ctx.fillStyle = '#34322d'
        ctx.fillRect(x, 0, 3, h)
      }
      for (let i = 0; i < 9; i++) {
        const x = (i + 0.5) * (w / 9)
        ctx.fillStyle = '#2b2925'
        ctx.fillRect(x - 6, 12, 12, 18)
        ctx.fillRect(x - 6, h - 30, 12, 18)
      }
    },
    { repeat },
  )
}

export function trackbedTexture(repeat: [number, number]) {
  return makeTexture(
    'trackbed',
    512,
    512,
    (ctx, w, h, rnd) => {
      grain(ctx, w, h, [78, 75, 70], 30, rnd)
      blotches(ctx, w, h, rnd, 60, [24, 22, 20], 70, 0.25)
      blotches(ctx, w, h, rnd, 20, [120, 96, 70], 50, 0.12)
      ctx.fillStyle = 'rgba(20,18,16,0.6)'
      ctx.fillRect(w / 2 - 14, 0, 28, h)
    },
    { repeat },
  )
}

export function tileTexture(rgb: RGB, repeat: [number, number]) {
  return makeTexture(
    `tile-${rgb.join('-')}`,
    512,
    512,
    (ctx, w, h, rnd) => {
      ctx.fillStyle = '#d4d0c6'
      ctx.fillRect(0, 0, w, h)
      const n = 12
      const s = w / n
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const j2 = (rnd() - 0.5) * 18
          ctx.fillStyle = `rgb(${rgb[0] + j2},${rgb[1] + j2},${rgb[2] + j2})`
          ctx.fillRect(i * s + 2, j * s + 2, s - 4, s - 4)
          const g = ctx.createLinearGradient(i * s, j * s, i * s + s, j * s + s)
          g.addColorStop(0, 'rgba(255,255,255,0.12)')
          g.addColorStop(1, 'rgba(0,0,0,0.08)')
          ctx.fillStyle = g
          ctx.fillRect(i * s + 2, j * s + 2, s - 4, s - 4)
        }
      }
    },
    { repeat },
  )
}

export function graniteTexture(repeat: [number, number]) {
  return makeTexture(
    'granite',
    512,
    512,
    (ctx, w, h, rnd) => {
      grain(ctx, w, h, [178, 175, 168], 22, rnd)
      for (let i = 0; i < 5000; i++) {
        const dark = rnd() > 0.45
        ctx.fillStyle = dark ? `rgba(60,58,56,${0.3 + rnd() * 0.5})` : `rgba(240,238,232,${0.3 + rnd() * 0.5})`
        const r = 0.6 + rnd() * 1.6
        ctx.fillRect(rnd() * w, rnd() * h, r, r)
      }
      ctx.fillStyle = 'rgba(120,116,110,0.8)'
      for (const p of [0, w / 2]) {
        ctx.fillRect(p, 0, 2, h)
        ctx.fillRect(0, p, w, 2)
      }
    },
    { repeat },
  )
}

export function ceilingTexture(repeat: [number, number]) {
  return makeTexture(
    'ceiling',
    256,
    256,
    (ctx, w, h, rnd) => {
      grain(ctx, w, h, [226, 224, 218], 8, rnd)
      ctx.fillStyle = '#a9a69e'
      ctx.fillRect(0, 0, w, 3)
      ctx.fillRect(0, 0, 3, h)
      ctx.fillStyle = 'rgba(150,148,140,0.35)'
      for (let x = 12; x < w; x += 12) for (let y = 12; y < h; y += 12) ctx.fillRect(x, y, 2, 2)
    },
    { repeat },
  )
}

export function brushedSteelTexture(repeat: [number, number]) {
  return makeTexture(
    'brushed-steel',
    512,
    512,
    (ctx, w, h, rnd) => {
      grain(ctx, w, h, [196, 199, 202], 10, rnd)
      for (let i = 0; i < 900; i++) {
        const v = 150 + rnd() * 100
        ctx.fillStyle = `rgba(${v},${v},${v + 4},${0.05 + rnd() * 0.1})`
        ctx.fillRect(0, rnd() * h, w, 1)
      }
    },
    { repeat },
  )
}

export function psdLeafTexture() {
  return makeTexture('psd-leaf', 256, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(150,182,192,0.22)'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#9ea3a8'
    ctx.fillRect(0, 0, w, 22)
    ctx.fillRect(0, h - 30, w, 30)
    ctx.fillRect(0, 0, 14, h)
    ctx.fillRect(w - 14, 0, 14, h)
    ctx.fillStyle = '#d6001c'
    ctx.fillRect(14, h * 0.52, w - 28, 10)
  })
}

export function trainDoorTexture() {
  return makeTexture('train-door', 256, 512, (ctx, w, h, rnd) => {
    grain(ctx, w, h, [190, 193, 196], 10, rnd)
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.08})`
      ctx.fillRect(0, rnd() * h, w, 1)
    }
    ctx.fillStyle = '#0c1014'
    ctx.beginPath()
    ctx.roundRect(36, 40, w - 72, h * 0.42, 18)
    ctx.fill()
    ctx.fillStyle = '#c8102e'
    ctx.fillRect(0, h * 0.6, w, 18)
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(w - 12, 0, 12, h)
  })
}

export function carInteriorTexture() {
  return makeTexture('car-interior', 256, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#f3f1ea')
    g.addColorStop(0.65, '#c9cbcd')
    g.addColorStop(0.66, '#5d6064')
    g.addColorStop(1, '#3d3f42')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#b7babe'
    ctx.fillRect(w / 2 - 5, 30, 10, h * 0.62)
    ctx.fillStyle = '#e1222e'
    ctx.fillRect(20, 20, w - 40, 12)
  })
}

function fontOf(family: string, weight: number, size: number) {
  return `${weight} ${size}px ${family}`
}

export function nameWallTexture(family: string, zh: string, en: string, rgb: RGB) {
  return makeTexture(`name-wall-${zh}-${family}`, 2048, 512, (ctx, w, h) => {
    ctx.fillStyle = `rgb(${rgb[0] * 0.55},${rgb[1] * 0.55},${rgb[2] * 0.55})`
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#f2efe6'
    ctx.lineWidth = 14
    ctx.strokeRect(22, 22, w - 44, h - 44)
    ctx.fillStyle = '#f7f5ef'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = fontOf(family, 900, 250)
    ctx.fillText(zh.split('').join(' '), w / 2, h * 0.42)
    ctx.font = fontOf(family, 700, 78)
    ctx.fillText(en, w / 2, h * 0.8)
  })
}

export function headerStripTexture(family: string, zh: string, en: string, rgb: RGB, repeat: [number, number]) {
  return makeTexture(
    `header-${zh}-${family}`,
    1024,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#17191c'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = `rgb(${rgb.join(',')})`
      ctx.fillRect(60, 30, 68, 68)
      ctx.fillStyle = '#ffffff'
      ctx.textBaseline = 'middle'
      ctx.font = fontOf(family, 700, 62)
      ctx.fillText(zh, 160, h / 2 + 2)
      const zhW = ctx.measureText(zh).width
      ctx.font = fontOf(family, 500, 42)
      ctx.fillStyle = '#c9ccd0'
      ctx.fillText(en, 190 + zhW, h / 2 + 4)
    },
    { repeat },
  )
}

export function stopBoardTexture(family: string) {
  return makeTexture(`stop-board-${family}`, 256, 320, (ctx, w, h) => {
    ctx.fillStyle = '#ffd200'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#111'
    ctx.lineWidth = 12
    ctx.strokeRect(6, 6, w - 12, h - 12)
    ctx.fillStyle = '#111'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = fontOf(family, 900, 150)
    ctx.fillText('停', w / 2, h * 0.38)
    ctx.font = fontOf(family, 900, 80)
    ctx.fillText('8', w / 2, h * 0.8)
  })
}

export function exitSignTexture(family: string) {
  return makeTexture(`exit-sign-${family}`, 512, 160, (ctx, w, h) => {
    ctx.fillStyle = '#0b8a46'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'middle'
    ctx.font = fontOf(family, 700, 64)
    ctx.fillText('緊急出口', 120, h / 2 - 14)
    ctx.font = fontOf(family, 700, 36)
    ctx.fillText('EMERGENCY EXIT', 120, h / 2 + 42)
    ctx.beginPath()
    ctx.moveTo(30, h / 2)
    ctx.lineTo(90, h / 2 - 40)
    ctx.lineTo(90, h / 2 + 40)
    ctx.closePath()
    ctx.fill()
  })
}

export function destinationTexture(family: string, zh: string, en: string) {
  return makeTexture(`dest-${zh}-${family}`, 512, 96, (ctx, w, h) => {
    ctx.fillStyle = '#050505'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#ffae2b'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.font = fontOf(family, 700, 56)
    ctx.fillText(`${zh}  ${en}`, w / 2, h / 2 + 2)
  })
}
