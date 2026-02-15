'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
  { emoji: '🏠', label: '대시보드', href: '/' },
  { emoji: '📋', label: '칸반', href: '/workspace/default' },
  { emoji: '📝', label: '블로그', href: '/blog' },
  { emoji: '💰', label: '매출', href: '/revenue' },
  { emoji: '⚙️', label: '설정', href: '/settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 bg-slate-950 border-r border-slate-800 flex-col z-50">
      <div className="p-4 border-b border-slate-800">
        <h1 className="text-lg font-bold text-slate-50 tracking-tight">🚀 Mission Control</h1>
        <p className="text-xs text-slate-500 mt-1">KYUTOPIA</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map(item => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-slate-800 text-slate-50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-50 hover:bg-slate-800/50'
              }`}
            >
              <span className="text-lg">{item.emoji}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="text-xs text-slate-600">v1.0 · AI-Powered</div>
      </div>
    </aside>
  )
}
