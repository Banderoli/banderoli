// app/(dashboard)/layout.tsx
'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  // Функция для подсветки активной вкладки
  const isActive = (path: string) => pathname === path

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* ГЛОБАЛЬНАЯ ШАПКА */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-1">
            Banderoli<span className="text-indigo-600">.AI</span>
          </Link>
          
          {/* Скрываем текст ссылок на мобилках, оставляем иконки или компактный вид */}
          <div className="flex items-center gap-1 md:gap-3 overflow-x-auto no-scrollbar">
            <Link href="/dashboard" className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${isActive('/dashboard') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              Дашборд
            </Link>
            <Link href="/analytics" className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${isActive('/analytics') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              Аналитика
            </Link>
            <Link href="/archive" className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${isActive('/archive') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              Архив
            </Link>
            <Link href="/profile" className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${isActive('/profile') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              Кабинет
            </Link>
            
            <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block"></div>
            
            <button onClick={handleLogout} className="px-3 py-2 text-sm font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all">
              Выход
            </button>
          </div>
        </div>
      </nav>

      {/* КОНТЕНТ СТРАНИЦЫ (Дашборд, Кабинет и тд будут рендериться здесь) */}
      <main className="flex-1 w-full max-w-5xl mx-auto">
        {children}
      </main>
    </div>
  )
}