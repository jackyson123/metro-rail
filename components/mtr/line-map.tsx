import { STATIONS } from '@/lib/mtr/engine'
import { cn } from '@/lib/utils'

export function LineMap({ pos, target }: { pos: number; target: number }) {
  const first = STATIONS[0].pos
  const last = STATIONS[STATIONS.length - 1].pos
  const pct = (p: number) => ((p - first) / (last - first)) * 100
  const trainPct = Math.min(100, Math.max(0, pct(pos)))

  return (
    <div className="px-6 pt-2 pb-7" aria-label="港島綫路線圖">
      <div className="relative h-2 rounded-full bg-line">
        <div className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/40" style={{ width: `${trainPct}%` }} />
        {STATIONS.map((st, i) => (
          <div key={st.zh} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${pct(st.pos)}%` }}>
            <div
              className={cn(
                'size-3.5 rounded-full border-2 border-line bg-background',
                i === target && 'size-4 border-primary',
              )}
            />
            <span
              className={cn(
                'absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] sm:text-xs',
                i === target ? 'font-bold text-foreground' : 'text-muted-foreground',
              )}
            >
              {st.zh}
            </span>
          </div>
        ))}
        <div
          className="absolute top-1/2 h-3 w-5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-primary shadow"
          style={{ left: `${trainPct}%` }}
          aria-label="列車位置"
        />
      </div>
    </div>
  )
}
