'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Archive, Search, CheckCircle2, XCircle, PackageX, 
  Copy, Check, Loader2, CalendarDays, Undo2, ArrowRightLeft
} from 'lucide-react'

// Строгая типизация
interface Parcel { 
  id: string; 
  trackCode: string; 
  name: string; 
  value: number; 
  status: string; 
  updatedAt: string; 
}

interface ParcelsResponse {
  parcels: Parcel[];
}

export default function ArchivePage() {
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'доставлено' | 'утеряно'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  // ── ЗАГРУЗКА ДАННЫХ ─────────────────────────────────────────
  useEffect(() => {
    const fetchArchive = async () => {
      try {
        const res = await fetch('/api/parcels').catch(() => ({ ok: false, json: () => ({ parcels: [] }) }))
        
        if (res.ok) {
          const data: ParcelsResponse = await res.json()
          if (data.parcels) {
            // Оставляем только архивные
            const inactive = data.parcels
              .filter((p: Parcel) => ['доставлено', 'утеряно'].includes(p.status.toLowerCase()))
              .sort((a: Parcel, b: Parcel) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            
            setParcels(inactive)
          }
        }
      } catch (error) {
        console.error('Ошибка при получении архива:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchArchive()
  }, [])

  // ── МАТЕМАТИКА И ЛОГИКА ─────────────────────────────────────
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

  const filteredParcels = useMemo(() => {
    return parcels.filter(p => {
      const matchesSearch = 
        p.trackCode.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = filterStatus === 'all' || p.status.toLowerCase() === filterStatus
      return matchesSearch && matchesStatus
    })
  }, [parcels, searchQuery, filterStatus])

  // ── ФУНКЦИОНАЛ ──────────────────────────────────────────────
  const handleCopy = (trackCode: string, id: string) => {
    navigator.clipboard.writeText(trackCode)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Восстановление в Дашборд
  const handleRestore = async (id: string) => {
    setRestoringId(id)
    try {
      // Здесь будет вызов твоего API для изменения статуса
      // await fetch(`/api/parcels/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'Ожидается' }) })
      
      // Имитация задержки сети
      await new Promise(res => setTimeout(res, 800)) 
      
      // Удаляем из локального состояния (оно перешло в дашборд)
      setParcels(prev => prev.filter(p => p.id !== id))
    } catch (error) {
      console.error('Ошибка восстановления', error)
    } finally {
      setRestoringId(null)
    }
  }

  // ── UI ЗАГРУЗКИ ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-4">
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
        <p className="font-medium animate-pulse">Поднятие архивных записей...</p>
      </div>
    )
  }

  return (
    <>
      {/* ЖЕСТКИЙ ФИКС ТЕКСТА ДЛЯ МОБИЛЬНЫХ УСТРОЙСТВ */}
      <style>{`
        .text-fix {
          color: #0f172a !important;
          -webkit-text-fill-color: #0f172a !important;
          opacity: 1 !important;
        }
        input, select {
          color: #0f172a !important;
          -webkit-text-fill-color: #0f172a !important;
        }
        input::placeholder {
          color: #94a3b8 !important;
          -webkit-text-fill-color: #94a3b8 !important;
        }
      `}</style>

      <div className="py-6 space-y-6 animate-fade-in max-w-7xl mx-auto px-4 md:px-8 min-h-screen">
        
        {/* Шапка и Статистика */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl shadow-sm border border-slate-700">
              <Archive size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight text-fix">Архив отправлений</h1>
              <p className="text-slate-500 mt-1 text-sm font-medium">История доставленных и проблемных заказов</p>
            </div>
          </div>

          {/* Виджеты математики */}
          <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 px-6 py-4 rounded-2xl border border-emerald-100/50 flex-1 xl:flex-none shadow-sm relative overflow-hidden group">
              <div className="absolute -right-2 -top-2 opacity-[0.03] group-hover:scale-110 transition-transform"><CheckCircle2 size={80}/></div>
              <p className="text-[10px] uppercase font-extrabold text-emerald-600 mb-1 tracking-wider relative z-10">Сумма доставленных</p>
              <p className="text-2xl font-black text-emerald-800 text-fix relative z-10">{stats.deliveredTotal.toFixed(2)} ₾</p>
            </div>
            <div className="bg-gradient-to-br from-rose-50 to-red-50 px-6 py-4 rounded-2xl border border-rose-100/50 flex-1 xl:flex-none shadow-sm relative overflow-hidden group">
              <div className="absolute -right-2 -top-2 opacity-[0.03] group-hover:scale-110 transition-transform"><XCircle size={80}/></div>
              <p className="text-[10px] uppercase font-extrabold text-rose-600 mb-1 tracking-wider relative z-10">Убыток (утеряно)</p>
              <p className="text-2xl font-black text-rose-800 text-fix relative z-10">{stats.lostTotal.toFixed(2)} ₾</p>
            </div>
          </div>
        </div>

        {/* Панель управления (Поиск и Фильтры) */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            </div>
            <input
              type="text"
              placeholder="Поиск по треку или названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-semibold shadow-sm"
            />
          </div>

          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-full lg:w-auto overflow-x-auto hide-scrollbar">
            {(['all', 'доставлено', 'утеряно'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl text-sm font-black capitalize transition-all whitespace-nowrap ${
                  filterStatus === status 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
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
              <div className="p-6 bg-slate-50 rounded-full"><PackageX size={48} className="text-slate-300" /></div>
              <p className="font-bold text-slate-500">По вашему запросу ничего не найдено</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredParcels.map(p => {
                const isDelivered = p.status.toLowerCase() === 'доставлено'
                const isRestoring = restoringId === p.id

                return (
                  <div key={p.id} className={`p-5 md:p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 hover:bg-slate-50 transition-all group ${isRestoring ? 'opacity-50 pointer-events-none blur-[1px]' : ''}`}>
                    
                    {/* Левая часть (Иконка, Имя, Трек) */}
                    <div className="flex items-start gap-4 min-w-0">
                      <div className={`p-3 rounded-2xl flex-shrink-0 mt-1 shadow-inner border ${isDelivered ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                        {isDelivered ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors truncate text-fix">
                          {p.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <button 
                            onClick={() => handleCopy(p.trackCode, p.id)}
                            className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-slate-200 hover:border-indigo-200"
                            title="Копировать трек-код"
                          >
                            {p.trackCode}
                            {copiedId === p.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${
                            isDelivered ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Правая часть (Цена, Дата, Кнопка восстановления) */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-end gap-6 w-full lg:w-auto mt-2 lg:mt-0 pt-4 lg:pt-0 border-t border-slate-100 lg:border-t-0">
                      
                      <div className="text-left sm:text-right">
                        <p className="font-black text-2xl text-slate-900 text-fix">{Number(p.value).toFixed(2)} <span className="text-sm font-bold text-slate-400">₾</span></p>
                        <p className="text-[11px] text-slate-400 mt-1 font-bold flex items-center sm:justify-end gap-1.5 uppercase tracking-wide">
                          <CalendarDays size={14} className="text-slate-300" />
                          {new Date(p.updatedAt).toLocaleDateString('ru-RU', { 
                            day: 'numeric', month: 'short', year: 'numeric' 
                          })}
                        </p>
                      </div>

                      {/* Кнопка "Восстановить в дашборд" */}
                      <button
                        onClick={() => handleRestore(p.id)}
                        disabled={isRestoring}
                        className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm hover:shadow active:scale-95 whitespace-nowrap"
                      >
                        {isRestoring ? <Loader2 size={16} className="animate-spin" /> : <Undo2 size={16} />}
                        Восстановить
                      </button>

                    </div>

                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}