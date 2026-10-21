const MAX = 100
const START = -225
const SWEEP = 270

function polar(r: number, deg: number): [string, string] {
  const rad = (deg * Math.PI) / 180
  // Keep SVG coordinates textually identical across server and client renders.
  return [(100 + r * Math.cos(rad)).toFixed(6), (100 + r * Math.sin(rad)).toFixed(6)]
}

function angleFor(v: number) {
  return START + (Math.min(v, MAX) / MAX) * SWEEP
}

export function Speedometer({ speed, limit }: { speed: number; limit: number }) {
  const ticks = Array.from({ length: 11 }, (_, i) => i * 10)
  const limitAngle = angleFor(limit)
  const [lx1, ly1] = polar(78, limitAngle)
  const [lx2, ly2] = polar(92, limitAngle)
  const needle = angleFor(speed)
  const [nx, ny] = polar(70, needle)
  const over = speed > limit + 0.5

  return (
    <div className="relative aspect-square w-full max-w-52">
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <circle cx="100" cy="100" r="96" className="fill-card stroke-border" strokeWidth="2" />
        {ticks.map((t) => {
          const a = angleFor(t)
          const [x1, y1] = polar(80, a)
          const [x2, y2] = polar(90, a)
          const [tx, ty] = polar(64, a)
          return (
            <g key={t}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-foreground" strokeWidth="2" />
              <text
                x={tx}
                y={ty}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground font-mono"
                fontSize="11"
              >
                {t}
              </text>
            </g>
          )
        })}
        <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} className="stroke-primary" strokeWidth="6" strokeLinecap="round" />
        <line
          x1="100"
          y1="100"
          x2={nx}
          y2={ny}
          className={over ? 'stroke-primary' : 'stroke-accent'}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="100" cy="100" r="7" className="fill-foreground" />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center">
        <span className={`font-mono text-3xl font-bold tabular-nums ${over ? 'text-primary' : 'text-accent'}`}>
          {Math.round(speed)}
        </span>
        <span className="text-xs text-muted-foreground">km/h</span>
      </div>
    </div>
  )
}
