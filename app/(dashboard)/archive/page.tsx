'use client'
import { useState, useEffect } from 'react'

interface Parcel { id: string; trackCode: string; name: string; value: number; status: string; updatedAt: string; }

export default function ArchivePage() {
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/parcels/get').then(res => res.json()).then(data => {
      if (data.parcels) {
        const inactive = data.parcels.filter((p: any) => p.status === 'доставлено' || p.status === 'утеряно')
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        setParcels(inactive)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-20 text-center text-slate-500">Загрузка архива...</div>

  return (
    <div className="py-6 space-y-6 animate-fade-in">
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Архив посылок</h1>
        <p className="text-slate-500 mt-2">История доставленных и утерянных отправлений.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {parcels.length === 0 ? <div className="p-10 text-center text-slate-500 font-medium">Архив пока пуст.</div> : (
          <div className="divide-y divide-slate-100">
            {parcels.map(p => (
              <div key={p.id} className="p-5 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 transition-colors">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{p.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded select-all">{p.trackCode}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${p.status === 'доставлено' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{p.status.toUpperCase()}</span>
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <p className="font-black text-xl text-slate-900">{Number(p.value).toFixed(2)} ₾</p>
                  <p className="text-xs text-slate-400 mt-1">Обновлено: {new Date(p.updatedAt).toLocaleDateString('ru-RU')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}