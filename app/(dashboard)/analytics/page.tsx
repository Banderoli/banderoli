'use client'
import { useState, useEffect, useMemo } from 'react'

interface Parcel { id: string; value: number; recipient: string; carrier: string; status: string; createdAt: string; purchaseDate?: string; }
interface Partner { id: string; name: string; isActive: boolean; }
interface WeatherInfo { hub: string; temp: string; condition: string; icon: string; }

export default function AnalyticsPage() {
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [ownerName, setOwnerName] = useState('Владелец')
  const [loading, setLoading] = useState(true)
  
  const [weatherData, setWeatherData] = useState<WeatherInfo[]>([
    { hub: 'США (Вилмингтон)', temp: '--', condition: 'Загрузка...', icon: '☁️' },
    { hub: 'Китай (Гуанчжоу)', temp: '--', condition: 'Загрузка...', icon: '☁️' },
    { hub: 'Турция (Стамбул)', temp: '--', condition: 'Загрузка...', icon: '☁️' },
    { hub: 'Германия (Франкфурт)', temp: '--', condition: 'Загрузка...', icon: '☁️' },
  ])

  const API_KEY = '558d45f34dad570eafe1838f24dcc922'
  const CITIES = ['Wilmington', 'Guangzhou', 'Istanbul', 'Frankfurt']

  useEffect(() => {
    // Загрузка данных
    Promise.all([fetch('/api/parcels/get'), fetch('/api/partners')])
      .then(async ([resParcels, resPartners]) => {
        const dataParcels = resParcels.ok ? await resParcels.json() : { parcels: [] }
        const dataPartners = resPartners.ok ? await resPartners.json() : { partners: [] }
        if (dataPartners.ownerName) setOwnerName(dataPartners.ownerName)
        if (dataPartners.partners) setPartners(dataPartners.partners)
        if (dataParcels.parcels) {
          setParcels(dataParcels.parcels.map((p: any) => ({
            ...p, value: Number(p.value), recipient: p.recipient === 'Я' ? (dataPartners.ownerName || 'Владелец') : p.recipient
          })))
        }
        setLoading(false)
      }).catch(() => setLoading(false))

    // Загрузка погоды
    const fetchWeather = async () => {
      const weatherResults = await Promise.all(CITIES.map(async (city) => {
        try {
          const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=ru`);
          const data = await res.json();
          return {
            hub: city === 'Wilmington' ? 'США (Вилмингтон)' : city === 'Guangzhou' ? 'Китай (Гуанчжоу)' : city === 'Istanbul' ? 'Турция (Стамбул)' : 'Германия (Франкфурт)',
            temp: `${Math.round(data.main.temp)}°C`,
            condition: data.weather[0].description,
            icon: data.weather[0].main === 'Clear' ? '☀️' : data.weather[0].main === 'Clouds' ? '☁️' : '🌧️'
          };
        } catch {
          return { hub: city, temp: 'N/A', condition: 'Ошибка', icon: '❓' };
        }
      }));
      setWeatherData(weatherResults);
    };
    fetchWeather();
  }, [])

  const activeParcels = useMemo(() => parcels.filter(p => p.status !== 'доставлено' && p.status !== 'утеряно'), [parcels])
  const getPartnerSum = (name: string) => activeParcels.filter(p => p.recipient === name).reduce((sum, p) => sum + p.value, 0);

  const monthlyStats = useMemo(() => {
    const stats: Record<string, number> = {};
    parcels.forEach(p => {
      const date = new Date(p.purchaseDate || p.createdAt);
      const monthLabel = date.toLocaleString('ru-RU', { month: 'short' }); 
      stats[monthLabel] = (stats[monthLabel] || 0) + p.value;
    });
    return Object.entries(stats).map(([month, total]) => ({ month, total }));
  }, [parcels]);

  const maxExpense = Math.max(...monthlyStats.map(s => s.total), 1);

  const carrierStats = useMemo(() => {
    const counts: Record<string, number> = {};
    parcels.forEach(p => { counts[p.carrier] = (counts[p.carrier] || 0) + 1; });
    const total = parcels.length || 1;
    return Object.entries(counts).map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) })).sort((a, b) => b.count - a.count);
  }, [parcels]);

  return (
    <div className="py-6 space-y-8 animate-fade-in">
      
      {/* 1. ПОГОДА */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {weatherData.map((w, idx) => (
          <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
            <span className="text-3xl mb-1">{w.icon}</span>
            <p className="text-xl font-black text-slate-800">{w.temp}</p>
            <p className="text-xs font-bold text-slate-500 uppercase truncate w-full text-center">{w.hub}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{w.condition}</p>
          </div>
        ))}
      </div>

      {/* 2. РАСХОДЫ (ИНФОГРАФИК) И СЛУЖБЫ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Инфографик расходов */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h2 className="text-xl font-extrabold text-slate-800 mb-6">Динамика расходов (₾)</h2>
          <div className="flex items-end justify-between h-48 gap-3 mt-4 border-b border-slate-100 pb-2">
            {monthlyStats.length === 0 ? (
                <div className="w-full text-center text-slate-400 font-medium">Нет данных о расходах</div>
            ) : (
                monthlyStats.map((s, i) => {
                    const heightPercent = (s.total / maxExpense) * 100;
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                            <div className="w-full bg-slate-50 rounded-t-lg relative flex items-end justify-center h-full">
                                <div 
                                    className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg transition-all duration-700 ease-out group-hover:from-indigo-500 group-hover:to-indigo-300 shadow-lg" 
                                    style={{ height: `${heightPercent}%` }}
                                >
                                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold py-1 px-1.5 rounded transition-opacity whitespace-nowrap">
                                        {s.total.toFixed(0)} ₾
                                    </span>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase">{s.month}</span>
                        </div>
                    )
                })
            )}
          </div>
        </div>

        {/* СЛУЖБЫ */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h2 className="text-xl font-extrabold text-slate-800 mb-6">Популярные службы</h2>
          <div className="space-y-4">
            {carrierStats.length === 0 ? <p className="text-slate-400">Нет данных</p> : carrierStats.map((c, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-sm font-bold text-slate-600">
                  <span>{c.name}</span>
                  <span>{c.percent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${c.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. ЛИМИТЫ */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-extrabold text-slate-800 mb-6">Распределение лимитов (300 ₾)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[ownerName, ...partners.filter(p => p.isActive).map(p => p.name)].map(name => {
            const sum = getPartnerSum(name);
            const isOverLimit = sum >= 300;
            return (
              <div key={name} className={`p-5 rounded-2xl border ${isOverLimit ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                <p className="font-bold text-slate-700">{name}</p>
                <p className="text-2xl font-black mt-2">{sum.toFixed(2)} ₾</p>
                {isOverLimit && <p className="text-[10px] font-black text-rose-600 mt-1 uppercase">Превышен!</p>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}