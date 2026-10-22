export type RollingStock = {
  id: 'urban' | 'mtrain' | 'qtrain' | 'rtrain'
  name: string
  subtitle: string
  description: string
  accent: string
  motorHz: number
  cabLabel: string
}

export const ROLLING_STOCK: RollingStock[] = [
  { id: 'urban', name: '市區綫列車', subtitle: 'Urban Line', description: '經典港島綫車隊，操控均衡。', accent: '#c8102e', motorHz: 72, cabLabel: 'URBAN' },
  { id: 'mtrain', name: 'M-Train', subtitle: '現代化列車', description: '斬波器牽引聲鮮明，制動反應較快。', accent: '#2f6f9f', motorHz: 118, cabLabel: 'M-TRAIN' },
  { id: 'qtrain', name: 'Q-Train', subtitle: '市區綫願景列車', description: '流線車頭與安靜的交流牽引聲。', accent: '#9a6a2f', motorHz: 92, cabLabel: 'Q-TRAIN' },
  { id: 'rtrain', name: 'R-Train', subtitle: '新世代列車', description: '加速凌厲，儀表板採用高對比配色。', accent: '#2c8a68', motorHz: 145, cabLabel: 'R-TRAIN' },
]

export function getRollingStock(id: RollingStock['id']) {
  return ROLLING_STOCK.find((stock) => stock.id === id) ?? ROLLING_STOCK[0]
}
