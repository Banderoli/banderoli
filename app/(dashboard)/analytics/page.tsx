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
    return <div className="p-10 text-center text-gray-500 font-bold animate-pulse">Загрузка аналитики...</div>
  }

  if (!data) {
    return <div className="p-10 text-center text-red-500 font-bold">Не удалось загрузить данные</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      
      {/* Шапка */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">📊 Аналитика BF.lab</h1>
        <Link href="/dashboard" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-gray-200">
          ← Назад в Дашборд
        </Link>
      </div>

      {/* ВИДЖЕТ ПОГОДЫ В ХАБАХ */}
      <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-sm text-gray-500 font-bold mb-3 uppercase tracking-wider">Метеоусловия в транзитных хабах</h2>
        <WeatherWidget />
      </section>

      {/* Карточки со сводкой */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
          <p className="text-sm text-gray-500 font-bold">Всего потрачено</p>
          <p className="text-2xl font-black text-gray-800">{data.stats.totalSpent} ₾</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
          <p className="text-sm text-gray-500 font-bold">Всего посылок</p>
          <p className="text-2xl font-black text-gray-800">{data.stats.totalParcels} шт.</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500">
          <p className="text-sm text-gray-500 font-bold">Успешно доставлено</p>
          <p className="text-2xl font-black text-gray-800">{data.stats.deliveredCount} шт.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* График расходов */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-700 mb-6">Динамика расходов (₾)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{fontSize: 12}} stroke="#9ca3af" />
                <YAxis tick={{fontSize: 12}} stroke="#9ca3af" />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Круговая диаграмма перевозчиков */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
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