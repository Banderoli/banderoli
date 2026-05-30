'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import WeatherWidget from '@/components/WeatherWidget'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  /**
   * Загружает данные с сервера аналитики
   */
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/analytics')
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch (err) {
        console.error('Ошибка сети:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-bold animate-pulse">Загрузка модулей прогнозирования рисков...</div>
  }

  if (!data) {
    return <div className="p-10 text-center text-red-500 font-bold">Не удалось загрузить данные аналитики</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      
      {/* ШАПКА */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">📊 Аналитика Рисков BF.lab</h1>
        <Link href="/dashboard" className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-slate-200 transition-colors">
          ← Назад в Дашборд
        </Link>
      </div>

      {/* МЕТЕОДАННЫЕ */}
      <section className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <h2 className="text-sm text-slate-500 font-bold mb-3 uppercase tracking-wider">Метеоусловия в транзитных хабах (Влияние на задержки батчей)</h2>
        <WeatherWidget />
      </section>

      {/* ФИНАНСОВАЯ СВОДКА */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-blue-500 flex flex-col justify-between">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Общие траты</p>
          <p className="text-2xl font-black text-slate-800">{data.stats.totalSpent} ₾</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-emerald-500 flex flex-col justify-between">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Всего грузов</p>
          <p className="text-2xl font-black text-slate-800">{data.stats.totalParcels} шт.</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-purple-500 flex flex-col justify-between">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Успешно получено</p>
          <p className="text-2xl font-black text-slate-800">{data.stats.deliveredCount} шт.</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-red-500 flex flex-col justify-between">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Утеряно карго</p>
          <p className="text-2xl font-black text-red-600">{data.stats.lostCount} шт.</p>
        </div>
      </div>

      {/* СЕКЦИЯ: ТАМОЖЕННЫЙ МОНИТОРИНГ РИСКОВ */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
        <h2 className="font-bold text-slate-700 uppercase tracking-wide text-sm">Сводка по активным таможенным угрозам</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
            <p className="text-xs text-emerald-700 font-bold uppercase">Низкая угроза (0-30%)</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">{data.stats.lowRiskCount || 0}</p>
          </div>
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
            <p className="text-xs text-amber-700 font-bold uppercase">Средняя угроза (31-60%)</p>
            <p className="text-3xl font-black text-amber-600 mt-1">{data.stats.medRiskCount || 0}</p>
          </div>
          <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
            <p className="text-xs text-red-700 font-bold uppercase">Высокая угроза (61-100%)</p>
            <p className="text-3xl font-black text-red-600 mt-1">{data.stats.highRiskCount || 0}</p>
          </div>
        </div>
      </div>

      {/* ГРАФИКИ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="font-bold text-gray-700 mb-6">Динамика расходов (₾)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 12}} stroke="#94a3b8" />
                <YAxis tick={{fontSize: 12}} stroke="#94a3b8" />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="font-bold text-gray-700 mb-6">Популярные службы доставки</h2>
          <div className="h-64">
            {data.carrierData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.carrierData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {data.carrierData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">Нет данных для графика</div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}