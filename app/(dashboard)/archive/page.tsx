'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Archive, 
  Search, 
  CheckCircle2, 
  XCircle, 
  PackageX, 
  Copy, 
  Check,
  Loader2,
  CalendarDays
} from 'lucide-react'

// Строгая типизация без any
interface Parcel { 
  id: string; 
  trackCode: string; 
  name: string; 
  value: number; 
  status: string; 
  updatedAt: string; 
}

export default function ArchivePage() {
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'доставлено' | 'утеряно'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    const fetchArchive = async () => {
      try {
        const res = await fetch('/api/parcels/get')
        if (!res.ok) throw new Error('Ошибка загрузки')
        
        const data = await res.json()
        if (data.parcels) {
          // Строгая фильтрация и сортировка
          const inactive = data.parcels
            .filter((p: Parcel) => p.status.toLowerCase() === 'доставлено' || p.status.toLowerCase() === 'утеряно')
            .sort((a: Parcel, b: Parcel) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          
          setParcels(inactive)
        }
      } catch (error) {
        console.error('Ошибка при получении архива:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArchive()
  }, [])

  // МАТЕМАТИКА: Подсчет финансовой статистики
  const stats = useMemo(() => {
    return parcels.reduce(
      (acc, p) => {
        const val = Number(p.value) || 0
        if (p.status.toLowerCase() === 'доставлено') acc.deliveredTotal += val
        if (p.status.toLowerCase() === 'утеряно') acc.lostTotal += val
        return acc
      },
      { deliveredTotal: 0, lostTotal: 0 }
    )
  }, [parcels])

  // ЛОГИКА: Фильтрация по поиску и статусу
  const filteredParcels = useMemo(() => {
    return parcels.filter(p => {
      const matchesSearch = 
        p.trackCode.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = filterStatus === 'all' || p.status.toLowerCase() === filterStatus

      return matchesSearch && matchesStatus
    })
  }, [parcels, searchQuery, filterStatus])

  // ФУНКЦИОНАЛ: Копирование трек-кода
  const handleCopy = (trackCode: string, id: string) => {
    navigator.clipboard.writeText(trackCode)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000) // Сброс иконки через 2 сек
  }

  // UI: Состояние загрузки
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="font-medium">Поднятие архивных записей...</p>
      </div>
    )
  }

  return (
    <div className="py-6 space-y-6 animate-fade-in max-w-7xl mx-auto px-4 md:px-8">
      
      {/* Шапка */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 text-white rounded-2xl">
            <Archive size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Архив отправлений</h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">История успешно завершенных и проблемных заказов</p>
          </div>
        </div>

        {/* Виджеты статистики (Математика) */}
        <div className="flex gap-4 w-full lg:w-auto">
          <div className="bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 flex-1 lg:flex-none">
            <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Сумма доставленных</p>
            <p className="text-xl font-black text-emerald-700">{stats.deliveredTotal.toFixed(2)} ₾</p>
          </div>
          <div className="bg-rose-50 px-5 py-3 rounded-2xl border border-rose-100 flex-1 lg:flex-none">
            <p className="text-[10px] uppercase font-bold text-rose-600 mb-1">Убыток (утеряно)</p>
            <p className="text-xl font-black text-rose-700">{stats.lostTotal.toFixed(2)} ₾</p>
          </div>
        </div>
      </div>

      {/* Панель управления: Поиск и Фильтры */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="text-slate-400" size={18} />
          </div>
          <input
            type="text"
            placeholder="Поиск по треку или названию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium shadow-sm"
          />
        </div>

        <div className="flex bg-slate-200/50 p-1 rounded-2xl w-full md:w-auto overflow-x-auto">
          {(['all', 'доставлено', 'утеряно'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all whitespace-nowrap ${
                filterStatus === status 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {status === 'all' ? 'Все записи' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Список архива */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        {filteredParcels.length === 0 ? (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 space-y-4">
            <PackageX size={64} className="text-slate-200" />
            <p className="font-medium">По вашему запросу ничего не найдено</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredParcels.map(p => {
              const isDelivered = p.status.toLowerCase() === 'доставлено'
              return (
                <div key={p.id} className="p-5 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 transition-colors group">
                  
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-2xl flex-shrink-0 ${isDelivered ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                      {isDelivered ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <button 
                          onClick={() => handleCopy(p.trackCode, p.id)}
                          className="flex items-center gap-1.5 text-sm font-mono text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          title="Копировать трек-код"
                        >
                          {p.trackCode}
                          {copiedId === p.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wide ${
                          isDelivered ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left md:text-right w-full md:w-auto ml-14 md:ml-0">
                    <p className="font-black text-xl text-slate-900">{Number(p.value).toFixed(2)} <span className="text-sm font-bold text-slate-400">₾</span></p>
                    <p className="text-xs text-slate-400 mt-1 font-medium flex items-center md:justify-end gap-1">
                      <CalendarDays size={12} />
                      {new Date(p.updatedAt).toLocaleDateString('ru-RU', { 
                        day: 'numeric', month: 'short', year: 'numeric' 
                      })}
                    </p>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>
      
    </div>
  )
}