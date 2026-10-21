import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Noto_Sans_TC } from 'next/font/google'
import './globals.css'

const _noto = Noto_Sans_TC({ preload: false, weight: ['400', '500', '700', '900'] })
const _mono = JetBrains_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '港鐵模擬駕駛 · 港島綫 | MTR Driver Simulator',
  description: '化身港鐵車長，駕駛港島綫列車由堅尼地城開往金鐘，準確停站、開關車門，挑戰金牌車長。',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#16191d',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-HK" className="bg-background">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
