'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function ArchivePage() {
  const [parcels, setParcels] = useState<any[]>([])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/parcels/get')
      if (res.ok) {
        const data = await res.json()
        setParcels(data.parcels || [])
      }
    } catch (error) {
      console.error('Ошибка загрузки архива:', error)
    }
  }

  useEffect(() => { fetchData() }, [])

  const archiveParcels = parcels.filter(p => p.status === 'доставлено' || p.status === 'утеряно')

  const handleRestore = async (p: any) => {
    try {
      const res = await fetch(`/api/parcels/${p.id}`, {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, status: 'ожидается' }) 
      })
      
      if (res.ok) {
        fetchData() 
      } else {
        const data = await res.json()
        alert(`Ошибка: ${data.error || 'Не удалось восстановить посылку'}`)
      }
    } catch (error) {
      alert('Ошибка сети при попытке восстановления')
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 border-b pb-4">
        <Link href="/dashboard" className="text-blue-600 hover:underline font-bold text-lg">← Назад</Link>
        <h1 className="text-2xl font-bold text-gray-800">Архив посылок</h1>
      </div>

      <div className="space-y-3">
        {archiveParcels.map((p) => {
          const isLost = p.status === 'утеряно'
          const cardBg = isLost ? 'bg-yellow-50 border-yellow-400' : 'bg-green-50 border-green-200'
          const statusText = isLost ? '⚠️ Утеряно' : '✔ Доставлено'
          const statusColor = isLost ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'

          return (
            <div key={p.id} className={`p-4 rounded-xl border flex flex-col gap-2 ${cardBg}`}>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold ${!isLost && 'text-gray-600 line-through'}`}>{p.name}</p>
                    <span className={`${statusColor} text-xs px-2 py-0.5 rounded font-bold`}>{statusText}</span>
                  </div>
                  <div className="flex gap-2 text-sm font-medium">
                    <span className="text-gray-500 border rounded px-1 bg-white/60">{p.trackCode}</span>
                    <span className="bg-gray-200/60 px-2 rounded">{p.carrier}</span>
                  </div>
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-bold border bg-white/60 mt-1">
                    👤 {p.recipient}
                  </span>
                </div>
                <div className="text-right">
                  {/* ИСПРАВЛЕНИЕ: Форматирование цены до 2 знаков */}
                  <p className="font-bold text-lg text-gray-600">{Number(p.value).toFixed(2)} ₾</p>
                </div>
              </div>

              <div className="border-t border-gray-200/50 pt-3 mt-1 flex justify-end">
                <button 
                  onClick={() => handleRestore(p)} 
                  className="text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-1.5 rounded-lg font-bold transition-colors"
                >
                  ↩ Восстановить в активные
                </button>
              </div>
            </div>
          )
        })}
        
        {archiveParcels.length === 0 && <p className="text-center text-gray-500 py-8 font-medium">Архив пуст</p>}
      </div>
    </div>
  )
}