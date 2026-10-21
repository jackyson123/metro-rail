import { NOTCH_MAX, NOTCH_MIN, notchLabel } from '@/lib/mtr/engine'
import { cn } from '@/lib/utils'

export function NotchLever({ notch, onChange }: { notch: number; onChange: (n: number) => void }) {
  const notches = Array.from({ length: NOTCH_MAX - NOTCH_MIN + 1 }, (_, i) => NOTCH_MAX - i)

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">主控制器</span>
      <div role="radiogroup" aria-label="主控制器檔位" className="flex flex-col gap-0.5 rounded-md border border-border bg-card p-1">
        {notches.map((n) => {
          const active = n === notch
          const zone = n > 0 ? 'power' : n === 0 ? 'neutral' : n === NOTCH_MIN ? 'eb' : 'brake'
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(n)}
              className={cn(
                'flex h-6 w-20 items-center justify-between rounded-sm px-2 font-mono text-xs transition-colors',
                active
                  ? zone === 'power'
                    ? 'bg-accent text-accent-foreground'
                    : zone === 'neutral'
                      ? 'bg-foreground text-background'
                      : 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary',
              )}
            >
              <span className="font-bold">{notchLabel(n)}</span>
              <span className="text-[10px]">
                {zone === 'power' ? '加力' : zone === 'neutral' ? '惰行' : zone === 'eb' ? '緊急' : '制動'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
