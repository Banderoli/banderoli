'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Package, 
  Plane, 
  AlertTriangle, 
  CheckCircle, 
  MessageCircle, 
  Plus, 
  Calculator,
  Loader2,
  Clock,
  ShieldAlert,
  CloudRain,
  Cloud,
  Sun
} from 'lucide-react'

// Строгая типизация, соответствующая реальной базе данных (Neon/Prisma)
type Parcel = {
  id: string
  trackCode: string
  name: string
  value: number
  status: string
  updatedAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [userName, setUserName] = useState('Пользователь')
  const [loading, setLoading] = useState(true)
  
  // Состояние для реальной погоды
  const [weather, setWeather] = useState({ temp: '--', condition: 'Загрузка...', icon: 'unknown' })

  // Загрузка реальных данных из API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [resParcels, resPartners] = await Promise.all([
          fetch('/api/parcels/get'),
          fetch('/api/partners')
        ])

        if (resParcels.ok) {
          const dataParcels = await resParcels.json()
          if (dataParcels.parcels) setParcels(dataParcels.parcels)
        }
        
        if (resPartners.ok) {
          const dataPartners = await resPartners.json()
          if (dataPartners.ownerName) setUserName(dataPartners.ownerName.split(' ')[0]) // Берем только имя
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchWeather = async () => {
      try {
        const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || '558d45f34dad570eafe1838f24dcc922'
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Tbilisi&appid=${API_KEY}&units=metric&lang=ru`)
        const data = await res.json()
        
        let icon = 'unknown'
        if (data.weather[0].main === 'Clear') icon = 'clear'
        else if (data.weather[0].main === 'Clouds') icon = 'clouds'
        else if (['Rain', 'Drizzle', 'Thunderstorm'].includes(data.weather[0].main)) icon = 'rain'

        setWeather({
          temp: `+${Math.round(data.main.temp)}°C`,
          condition: data.weather[0].description,
          icon
        })
      } catch {
        setWeather({ temp: 'N/A', condition: 'Ошибка сети', icon: 'unknown' })
      }
    }

    fetchDashboardData()
    fetchWeather()
  }, [])

  // --- МАТЕМАТИКА: Таможенный лимит Грузии (300 ₾) ---
  const activeParcels = useMemo(() => parcels.filter(p => p.status.toLowerCase() !== 'доставлено' && p.status.toLowerCase() !== 'утеряно'), [parcels])
  const deliveredParcels = useMemo(() => parcels.filter(p => p.status.toLowerCase() === 'доставлено'), [parcels])
  
  const totalValueGEL = activeParcels.reduce((sum, p) => sum + Number(p.value || 0), 0)
  const isCustomsRisk = totalValueGEL >= 300
  const progressPercent = Math.min((totalValueGEL / 300) * 100, 100)
  const customsTaxEst = isCustomsRisk ? (totalValueGEL * 0.18) + 20 : 0 // 18% НДС + 20 лари сбор

  // UI Helpers
  const getStatusUI = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'доставлено') return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle size={14} /> }
    if (s === 'на таможне' || s === 'таможня') return { color: 'bg-rose-100 text-rose-700 border-rose-200', icon: <AlertTriangle size={14} /> }
    if (s === 'в пути') return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Plane size={14} /> }
    return { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock size={14} /> } // Ожидается
  }

  const renderWeatherIcon = () => {
    if (weather.icon === 'clear') return <Sun size={28} className="text-amber-300" />
    if (weather.icon === 'clouds') return <Cloud size={28} className="text-white" />
    if (weather.icon === 'rain') return <CloudRain size={28} className="text-blue-200" />
    return <Cloud size={28} className="text-white/50" />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="font-medium">Синхронизация с серверами логистики...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 md:px-8 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Шапка дашборда */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Привет, {userName}! 👋</h1>
            <p className="text-slate-500 mt-1 font-medium">Контроль логистики и таможенных лимитов</p>
          </div>
          <button 
            onClick={() => router.push('/dashboard/add')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <Plus size={20} />
            Добавить трек
          </button>
        </header>

        {/* Сетка статистики (Виджеты) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 transition-transform hover:scale-[1.02]">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Package size={28} /></div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ожидается</p>
              <p className="text-3xl font-black text-slate-900">{activeParcels.length}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 transition-transform hover:scale-[1.02]">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><Plane size={28} /></div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">В пути (Транзит)</p>
              <p className="text-3xl font-black text-slate-900">
                {activeParcels.filter(p => p.status.toLowerCase() === 'в пути').length}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 transition-transform hover:scale-[1.02]">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><CheckCircle size={28} /></div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Доставлено</p>
              <p className="text-3xl font-black text-slate-900">{deliveredParcels.length}</p>
            </div>
          </div>

          {/* Виджет погоды (Тбилиси) */}
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-6 rounded-3xl shadow-md text-white flex items-center gap-5 relative overflow-hidden transition-transform hover:scale-[1.02]">
            <div className="absolute -right-4 -top-4 opacity-20">
              <CloudRain size={100} />
            </div>
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm z-10">
              {renderWeatherIcon()}
            </div>
            <div className="z-10">
              <p className="text-xs text-cyan-100 font-bold uppercase tracking-wider">Аэропорт Тбилиси</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-black">{weather.temp}</p>
              </div>
              <p className="text-[10px] text-cyan-50 capitalize mt-0.5">{weather.condition}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Главная колонка: Список посылок */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
              <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-extrabold text-slate-900">Активные грузы</h2>
                <Link href="/archive" className="text-sm text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 transition-colors">
                  Смотреть архив &rarr;
                </Link>
              </div>
              
              <div className="divide-y divide-slate-100">
                {activeParcels.length === 0 ? (
                  <div className="p-16 flex flex-col items-center text-center text-slate-400">
                    <div className="p-4 bg-slate-50 rounded-full mb-4">
                      <Package size={48} className="text-slate-300" />
                    </div>
                    <p className="font-bold text-lg text-slate-600 mb-1">Нет активных посылок</p>
                    <p className="text-sm">Все ваши отправления доставлены или еще не добавлены.</p>
                  </div>
                ) : (
                  activeParcels.map((parcel) => {
                    const statusUI = getStatusUI(parcel.status)
                    return (
                      <div key={parcel.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group cursor-pointer">
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 p-2.5 rounded-xl border ${statusUI.color} bg-opacity-50`}>
                            {statusUI.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <p className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">{parcel.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded select-all">{parcel.trackCode}</span>
                              <span className="text-xs text-slate-400 font-medium">• {Number(parcel.value).toFixed(2)} ₾</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-left sm:text-right w-full sm:w-auto pl-14 sm:pl-0">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border ${statusUI.color}`}>
                            {parcel.status}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-2 font-medium uppercase">
                            Обновлено: {new Date(parcel.updatedAt).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Правая колонка: Математика, Лимиты и Интеграции */}
          <div className="space-y-6">
            
            {/* Таможенный калькулятор (Математика B2B) */}
            <div className={`bg-white p-6 md:p-8 rounded-3xl shadow-sm border transition-colors ${isCustomsRisk ? 'border-rose-300 bg-rose-50/30' : 'border-slate-100'}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-2xl ${isCustomsRisk ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                  <Calculator size={24} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900">Таможенный лимит</h3>
                  <p className="text-xs text-slate-500 font-medium uppercase">Закон Грузии (300 ₾)</p>
                </div>
              </div>
              
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-slate-500 font-medium text-sm">Сумма в пути</span>
                    <span className={`text-2xl font-black ${isCustomsRisk ? 'text-rose-600' : 'text-slate-900'}`}>
                      {totalValueGEL.toFixed(2)} <span className="text-sm text-slate-400 font-bold">/ 300 ₾</span>
                    </span>
                  </div>
                  {/* Прогресс-бар лимита */}
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${isCustomsRisk ? 'bg-rose-500' : 'bg-indigo-500'}`}
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {isCustomsRisk ? (
                  <div className="p-4 bg-white rounded-2xl border border-rose-200 shadow-sm flex items-start gap-3 text-rose-800 text-sm">
                    <ShieldAlert size={20} className="mt-0.5 flex-shrink-0 text-rose-500" />
                    <div>
                      <p className="font-black">Превышен лимит</p>
                      <p className="mt-1 text-xs opacity-90 font-medium leading-relaxed">
                        Груз облагается налогом. Ожидаемая пошлина: <span className="font-bold underline">~{customsTaxEst.toFixed(2)} ₾</span>. Подготовьте инвойсы для растаможки.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />
                    <p className="text-sm text-slate-600 font-medium">
                      Всё в порядке. Вы не превышаете беспошлинный порог.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Интеграция с Telegram */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 md:p-8 rounded-3xl shadow-md text-white relative overflow-hidden group">
              <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <MessageCircle size={140} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <MessageCircle size={24} />
                  </div>
                  <h3 className="font-extrabold text-lg tracking-tight">Telegram-бот</h3>
                </div>
                <p className="text-indigo-100 text-sm mb-6 font-medium leading-relaxed">
                  Получайте мгновенные пуш-уведомления о смене статуса посылок и критических рисках растаможки.
                </p>
                <button className="w-full bg-white text-indigo-700 hover:bg-indigo-50 py-3.5 rounded-xl font-black text-sm transition-all shadow-sm hover:shadow-md">
                  Подключить уведомления
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}