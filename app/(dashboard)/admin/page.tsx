// app/(dashboard)/admin/page.tsx
'use client'
import { useState, useEffect } from 'react'

interface AdminUser {
  id: string;
  name: string;
  email: string;
  telegramLinked: boolean;
  createdAt: string;
  parcelsCount: number;
  partnersCount: number;
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState({ totalParcels: 0, totalUsers: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => {
        if (data.users) {
          setUsers(data.users);
          setStats(data.stats);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-20 text-center text-slate-500">Загрузка Admin Panel...</div>

  return (
    <div className="py-6 space-y-6">
      
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h1 className="text-2xl font-black text-slate-800">Admin Control Panel</h1>
        <p className="text-slate-500 mt-1">Глобальная статистика и управление платформой</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-md">
          <p className="text-indigo-200 font-bold uppercase text-sm">Всего пользователей</p>
          <p className="text-4xl font-black mt-2">{stats.totalUsers}</p>
        </div>
        <div className="bg-emerald-500 p-6 rounded-3xl text-white shadow-md">
          <p className="text-emerald-100 font-bold uppercase text-sm">Посылок в системе</p>
          <p className="text-4xl font-black mt-2">{stats.totalParcels}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-100">
              <tr>
                <th className="p-5">Пользователь</th>
                <th className="p-5">Email</th>
                <th className="p-5 text-center">Telegram</th>
                <th className="p-5 text-center">Посылок</th>
                <th className="p-5 text-center">Партнеров</th>
                <th className="p-5 text-right">Регистрация</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-5 font-bold text-slate-800">{user.name}</td>
                  <td className="p-5 text-slate-500">{user.email}</td>
                  <td className="p-5 text-center">{user.telegramLinked ? '✅' : '❌'}</td>
                  <td className="p-5 font-mono font-bold text-center text-indigo-600">{user.parcelsCount}</td>
                  <td className="p-5 font-mono text-center text-slate-600">{user.partnersCount}</td>
                  <td className="p-5 text-slate-400 text-right">{new Date(user.createdAt).toLocaleDateString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}