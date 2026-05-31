'use client'

import { useState, useEffect } from 'react'
import { 
  ShieldAlert, 
  Users, 
  Package, 
  Search, 
  TrendingUp, 
  MessageCircle,
  RefreshCw
} from 'lucide-react'

// Строгая типизация
interface AdminUser {
  id: string;
  name: string;
  email: string;
  telegramLinked: boolean;
  createdAt: string;
  parcelsCount: number;
  partnersCount: number;
}

interface Stats {
  totalParcels: number;
  totalUsers: number;
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<Stats>({ totalParcels: 0, totalUsers: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const res = await fetch('/api/admin/users')
        if (!res.ok) throw new Error('API не отвечает')
        
        const data = await res.json()
        if (data.users) {
          setUsers(data.users)
          setStats(data.stats)
        }
      } catch (error) {
        console.warn('Включаем тестовые данные (API еще не готов или вернул ошибку)')
        // Fallback: Восстановленные тестовые данные для настройки дизайна
        const mockUsers: AdminUser[] = [
          { id: '1', name: 'Шако T.', email: 'shakogt@gmail.com', telegramLinked: true, createdAt: '2026-05-30T10:00:00Z', parcelsCount: 15, partnersCount: 3 },
          { id: '2', name: 'Нина TN', email: 'nina.handmade@example.com', telegramLinked: false, createdAt: '2026-05-31T14:20:00Z', parcelsCount: 4, partnersCount: 0 },
          { id: '3', name: 'Элиран (Партнер)', email: 'eliran.il@example.com', telegramLinked: true, createdAt: '2026-05-25T09:15:00Z', parcelsCount: 89, partnersCount: 12 },
        ]
        setUsers(mockUsers)
        setStats({ totalParcels: 108, totalUsers: 3 })
      } finally {
        setLoading(false)
      }
    }

    fetchAdminData()
  }, [])

  // Математика и Логика фильтрации
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const avgParcels = stats.totalUsers > 0 ? (stats.totalParcels / stats.totalUsers).toFixed(1) : '0'
  const telegramAdoption = stats.totalUsers > 0 
    ? Math.round((users.filter(u => u.telegramLinked).length / users.length) * 100) 
    : 0

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-4">
        <RefreshCw className="animate-spin text-indigo-600" size={32} />
        <p className="font-medium">Инициализация модулей контроля...</p>
      </div>
    )
  }

  return (
    <div className="py-6 space-y-6 max-w-7xl mx-auto px-4 md:px-8">
      
      {/* Шапка */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 text-white rounded-2xl">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Терминал Управления</h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">Banderoli Logistics | Global Admin</p>
          </div>
        </div>
        
        {/* Поиск */}
        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-slate-400" size={18} />
          </div>
          <input
            type="text"
            placeholder="Поиск клиента..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Метрики (Математика бизнеса) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-3xl text-white shadow-md relative overflow-hidden">
          <Users className="absolute right-[-10px] bottom-[-10px] text-white/20" size={100} />
          <p className="text-indigo-100 font-bold uppercase text-xs tracking-wider">Клиентская база</p>
          <p className="text-4xl font-black mt-2 relative z-10">{stats.totalUsers}</p>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-3xl text-white shadow-md relative overflow-hidden">
          <Package className="absolute right-[-10px] bottom-[-10px] text-white/20" size={100} />
          <p className="text-emerald-100 font-bold uppercase text-xs tracking-wider">Всего грузов</p>
          <p className="text-4xl font-black mt-2 relative z-10">{stats.totalParcels}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <div className="flex justify-between items-center mb-2">
            <p className="text-slate-500 font-bold uppercase text-xs tracking-wider">Ср. кол-во посылок</p>
            <TrendingUp size={16} className="text-indigo-500" />
          </div>
          <p className="text-3xl font-black text-slate-800">{avgParcels} <span className="text-sm text-slate-400 font-medium">шт/пользователь</span></p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <div className="flex justify-between items-center mb-2">
            <p className="text-slate-500 font-bold uppercase text-xs tracking-wider">Охват Telegram</p>
            <MessageCircle size={16} className="text-blue-500" />
          </div>
          <div className="flex items-end gap-3">
            <p className="text-3xl font-black text-slate-800">{telegramAdoption}%</p>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${telegramAdoption}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Таблица пользователей */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase font-bold tracking-wider border-b border-slate-100">
              <tr>
                <th className="p-5">Клиент</th>
                <th className="p-5 hidden md:table-cell">Контакт</th>
                <th className="p-5 text-center">Уведомления</th>
                <th className="p-5 text-center">Грузы</th>
                <th className="p-5 text-center hidden sm:table-cell">Сеть (B2B)</th>
                <th className="p-5 text-right">Старт работы</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400 font-medium">
                    По вашему запросу ничего не найдено.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                    <td className="p-5">
                      <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{user.name}</p>
                      <p className="text-xs text-slate-400 md:hidden mt-0.5">{user.email}</p>
                    </td>
                    <td className="p-5 text-slate-500 hidden md:table-cell font-medium">{user.email}</td>
                    <td className="p-5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        user.telegramLinked 
                          ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {user.telegramLinked ? 'Подключен' : 'Отключен'}
                      </span>
                    </td>
                    <td className="p-5 font-mono font-bold text-center text-indigo-600 text-base">{user.parcelsCount}</td>
                    <td className="p-5 font-mono font-medium text-center text-slate-500 hidden sm:table-cell">{user.partnersCount}</td>
                    <td className="p-5 text-slate-400 text-right font-medium">{new Date(user.createdAt).toLocaleDateString('ru-RU')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}