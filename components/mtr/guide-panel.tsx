const STEPS = [
  { title: '開車', body: '車門關妥、出發訊號轉綠後，按 ↑ / W 將主控制器推上 P1–P4 加速。' },
  { title: '惰行', body: '接近限速時拉回 N 檔惰行。超速會扣分，超出 5 km/h 以上 ATP 會自動緊急制動。' },
  { title: '減速', body: '時速 80 km/h 時，約於停車位置前 400–450 米開始以 B3–B5 制動。' },
  { title: '對位', body: '接近黃色「停」字停車牌時逐步減至 B1–B2，令列車剛好停定。誤差 ±0.5 米得滿分。' },
  { title: '開門', body: '列車停定並保持 B 檔，按 O 開門讓乘客上落。' },
  { title: '關門', body: '乘客上落完畢（約 5 秒）按 C 關門，再開往下一站。' },
]

const KEYS = [
  ['↑ / W', '加力（向 P 推）'],
  ['↓ / S', '制動（向 B 拉）'],
  ['N', '回到惰行'],
  ['空白鍵', '緊急制動 EB'],
  ['O', '開門'],
  ['C', '關門'],
  ['V', '切換鏡頭（駕駛室 / 車頭外 / 月台側）'],
]

export function GuidePanel() {
  return (
    <section aria-labelledby="guide-title" className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <h2 id="guide-title" className="font-bold">
        駕駛須知
      </h2>
      <ol className="flex flex-col gap-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs">
              {i + 1}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold">{s.title}</span>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <h3 className="text-sm font-bold">鍵盤操作</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          {KEYS.map(([k, d]) => (
            <div key={k} className="contents">
              <dt>
                <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-xs">{k}</kbd>
              </dt>
              <dd className="text-muted-foreground">{d}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm leading-relaxed text-muted-foreground">
        <h3 className="font-bold text-foreground">計分方法</h3>
        <p>每站滿分 80：停車準確 50 分 + 準時 30 分。超速、ATP 制動及使用緊急制動會扣分。</p>
      </div>
    </section>
  )
}
