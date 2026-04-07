import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SlipSync - Thai Bank Slip Finance Tracker',
  description: 'Track your finances by scanning Thai bank slips',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
