import { Button } from '@/components/ui/button'
import type { StationResult } from '@/lib/mtr/engine'

function rank(pct: number) {
  if (pct >= 0.9) return '金牌車長'
  if (pct >= 0.75) return '資深車長'
  if (pct >= 0.55) return '合格車長'
  return '見習車長'
}

export function ResultScreen({ results, onRestart }: { results: StationResult[]; onRestart: () => void }) {
  const total = results.reduce((a, r) => a + r.total, 0)
  const max = results.length * 80

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-auto bg-background/90 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-xl flex-col gap-4">
        <div className="text-center">
          <p className="text-sm font-bold text-accent">行程完成 · 已到達金鐘</p>
          <h2 className="text-3xl font-bold">{rank(total / max)}</h2>
          <p className="font-mono text-lg tabular-nums text-muted-foreground">
            {total} / {max} 分
          </p>
        </div>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">各站成績</caption>
            <thead className="bg-secondary text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">車站</th>
                <th className="px-3 py-2 font-medium">誤差</th>
                <th className="px-3 py-2 font-medium">時間</th>
                <th className="px-3 py-2 font-medium">扣分</th>
                <th className="px-3 py-2 text-right font-medium">得分</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {results.map((r) => (
                <tr key={r.station} className="border-t border-border">
                  <td className="px-3 py-2 font-sans font-bold">{r.station}</td>
                  <td className="px-3 py-2">
                    {r.error >= 0 ? '+' : ''}
                    {r.error.toFixed(1)}m
                  </td>
                  <td className="px-3 py-2">
                    {r.actual}/{r.scheduled}s
                  </td>
                  <td className="px-3 py-2">{r.penalties ? `−${r.penalties}` : '0'}</td>
                  <td className="px-3 py-2 text-right font-bold text-accent">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center">
          <Button size="lg" onClick={onRestart}>
            再揸一次
          </Button>
        </div>
      </div>
    </div>
  )
}
