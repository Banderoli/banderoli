'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [parcels, setParcels] = useState<any[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [userCarriers, setUserCarriers] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [ownerName, setOwnerName] = useState<string>('Владелец')
  
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [editingParcelId, setEditingParcelId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    trackCode: '', name: '', value: '', carrier: 'Georgian Post', 
    expectedDate: '', purchaseDate: '', recipient: '', comment: '', status: 'ожидается'
  })

  const fetchData = async () => {
    try {
      const [resParcels, resPartners, resCarriers, resAlerts] = await Promise.all([
        fetch('/api/parcels/get'),
        fetch('/api/partners'),
        fetch('/api/carriers'),
        fetch('/api/alerts')
      ]);
      
      const dataParcels = resParcels.ok ? await resParcels.json() : { parcels: [] };
      const dataPartners = resPartners.ok ? await resPartners.json() : { partners: [] };
      const dataCarriers = resCarriers.ok ? await resCarriers.json() : { carriers: [] };
      const dataAlerts = resAlerts.ok ? await resAlerts.json() : { alerts: [] };
      
      if (dataPartners.ownerName) {
        setOwnerName(dataPartners.ownerName)
        setFormData(prev => ({ ...prev, recipient: prev.recipient || dataPartners.ownerName }))
      }
      
      if (dataPartners.partners) setPartners(dataPartners.partners)
      if (dataCarriers.carriers) setUserCarriers(dataCarriers.carriers)
      if (dataAlerts.alerts) setAlerts(dataAlerts.alerts)
      
      if (dataParcels.parcels) {
        setParcels(dataParcels.parcels.map((p: any) => ({
          ...p, recipient: p.recipient === 'Я' ? (dataPartners.ownerName || 'Владелец') : p.recipient
        })))
      }
    } catch (error) { 
      console.error('Ошибка при загрузке:', error) 
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleLogout = async () => { 
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login') 
  }
  
  const activeParcels = parcels.filter(p => p.status !== 'доставлено' && p.status !== 'утеряно')
  const deliveredCount = parcels.filter(p => p.status === 'доставлено').length
  const lostCount = parcels.filter(p => p.status === 'утеряно').length
  const getActiveCount = (name: string) => activeParcels.filter(p => p.recipient === name).length

  const baseCarriers = ['Georgian Post', 'Camex', 'USA2GEORGIA']
  const allAvailableCarriers = [...baseCarriers, ...userCarriers.map(c => c.name)]

  const findBestPartner = () => {
    if (!formData.value || !formData.expectedDate || !formData.carrier) return null
    const formValue = parseFloat(formData.value) || 0
    const formDate = new Date(formData.expectedDate).getTime()
    const allCandidates = [ownerName, ...partners.filter(p => p.isActive).map(p => p.name)]
    
    let best = null
    let minLoad = Infinity

    for (const candidate of allCandidates) {
      const load = activeParcels.filter(p => 
        p.carrier === formData.carrier && p.recipient === candidate && p.expectedDate && 
        Math.abs(new Date(p.expectedDate).getTime() - formDate) / 86400000 <= 4
      ).reduce((sum, p) => sum + p.value, 0)

      if (load < minLoad && (load + formValue < 300)) { 
        minLoad = load; 
        best = candidate 
      }
    }
    return best
  }

  const bestPartnerName = findBestPartner()

  const calculateRiskAndAdvise = () => {
    if (!formData.value || !formData.expectedDate || !formData.recipient || !formData.carrier) return null
    const formValue = parseFloat(formData.value) || 0
    const formDate = new Date(formData.expectedDate).getTime()

    const currentCluster = activeParcels.filter(p => 
      p.id !== editingParcelId && p.carrier === formData.carrier && p.recipient === formData.recipient && p.expectedDate && 
      Math.abs(new Date(p.expectedDate).getTime() - formDate) / 86400000 <= 4
    )
    
    const projectedTotal = currentCluster.reduce((sum, p) => sum + p.value, 0) + formValue

    if (projectedTotal >= 300) {
      return {
        message: `🚨 Внимание! Лимит превышен (${projectedTotal} ₾).`,
        advices: [ 
          bestPartnerName && bestPartnerName !== formData.recipient ? `👥 Выберите партнера: "${bestPartnerName}".` : `⚠️ Нет свободных лимитов!`, 
          `✈️ Задержите посылку.` 
        ]
      }
    }
    return null
  }

  const handleParcelSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingParcelId ? `/api/parcels/${editingParcelId}` : '/api/parcels'
    const method = editingParcelId ? 'PUT' : 'POST'
    try {
      const res = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(formData) 
      })
      if (res.ok) { 
        fetchData(); 
        resetForm(); 
      }
    } catch (err) { 
      alert('Ошибка сети') 
    }
  }

  const resetForm = () => {
    setFormData({ 
      trackCode: '', name: '', value: '', carrier: 'Georgian Post', 
      expectedDate: '', purchaseDate: '', recipient: ownerName, comment: '', status: 'ожидается' 
    })
    setEditingParcelId(null)
    setIsFormVisible(false)
  }

  const handleEdit = (p: any) => {
    setEditingParcelId(p.id)
    setFormData({
      trackCode: p.trackCode, name: p.name, value: p.value.toString(), carrier: p.carrier,
      expectedDate: p.expectedDate ? p.expectedDate.split('T')[0] : '',
      purchaseDate: p.purchaseDate ? p.purchaseDate.split('T')[0] : '',
      recipient: p.recipient, comment: p.comment || '', status: p.status || 'ожидается'
    })
    setIsFormVisible(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту посылку?')) return
    try {
      const res = await fetch(`/api/parcels/${id}`, { method: 'DELETE' })
      if (res.ok) fetchData()
      else alert('Ошибка сервера')
    } catch (err) { 
      alert('Ошибка сети') 
    }
  }

  const updateStatus = async (p: any, newStatus: string) => {
    await fetch(`/api/parcels/${p.id}`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ ...p, status: newStatus }) 
    })
    fetchData()
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      
      {/* ШАПКА */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Banderoli</h1>
        <div className="flex gap-2">
          {/* НОВАЯ КНОПКА АНАЛИТИКИ */}
          <Link href="/analytics" className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-indigo-200 flex items-center gap-2">
            📊 Аналитика
          </Link>
          <Link href="/profile" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-gray-200">Кабинет</Link>
          <Link href="/archive" className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-purple-200 flex items-center gap-2">
            📦 Архив
            <div className="flex gap-1 text-xs">
              {deliveredCount > 0 && <span title="Доставлено" className="bg-green-500 text-white px-2 py-0.5 rounded-md shadow-sm">{deliveredCount}</span>}
              {lostCount > 0 && <span title="Утеряно" className="bg-yellow-500 text-white px-2 py-0.5 rounded-md shadow-sm">{lostCount}</span>}
            </div>
          </Link>
          <button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-red-100">Выйти</button>
        </div>
      </div>

      {/* КРИТИЧЕСКИЙ БЛОК УВЕДОМЛЕНИЙ МОНИТОРИНГА ХАБОВ */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className={`p-4 border rounded-xl flex items-start gap-3 shadow-sm ${alert.severity === 'CRITICAL' ? 'bg-red-100 border-red-400 text-red-900' : 'bg-amber-50 border-amber-300 text-amber-900'}`}>
              <div className="text-lg">{alert.type === 'WEATHER' ? '⛈️' : '🏭'}</div>
              <div className="text-sm">
                <span className="font-bold">Мониторинг: </span> {alert.message}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ГРУППА ПАРТНЕРОВ (Без кнопки добавления) */}
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-blue-900">Группа партнеров</h2>
          <div className="flex gap-2">
            {!isFormVisible && (
              <button onClick={() => setIsFormVisible(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-700 text-sm transition-colors">
                + Заказ
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-2">
          <div className="relative">
            <span className={`px-4 py-2 rounded-lg text-sm font-bold block ${bestPartnerName === ownerName ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}>{ownerName}</span>
            {getActiveCount(ownerName) > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{getActiveCount(ownerName)}</span>}
          </div>
          {partners.filter(p => p.isActive).map(p => (
            <div key={p.id} className="relative">
              <span className={`px-4 py-2 rounded-lg text-sm font-bold block ${bestPartnerName === p.name ? 'bg-green-500 text-white' : 'bg-white text-blue-800 border'}`}>{p.name}</span>
              {getActiveCount(p.name) > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{getActiveCount(p.name)}</span>}
            </div>
          ))}
        </div>
      </div>

      {calculateRiskAndAdvise() && isFormVisible && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 flex flex-col gap-2">
          <p className="font-bold">{calculateRiskAndAdvise()?.message}</p>
          <div className="space-y-1">{calculateRiskAndAdvise()?.advices.map((a, i) => <div key={i} className="bg-white p-2 rounded text-sm">{a}</div>)}</div>
        </div>
      )}

      {/* ФОРМА СОЗДАНИЯ ЗАКАЗА */}
      {isFormVisible && (
        <form onSubmit={handleParcelSubmit} className="bg-white p-6 rounded-xl border shadow-lg space-y-4 relative">
          <button type="button" onClick={resetForm} className="absolute top-4 right-4 text-gray-400 font-bold hover:text-gray-600">✕ Скрыть</button>
          <h2 className="font-bold text-lg mb-2">{editingParcelId ? 'Редактировать' : 'Новая посылка'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <input required placeholder="Трек код" className="p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500" value={formData.trackCode} onChange={e => setFormData({...formData, trackCode: e.target.value})} />
            <input required placeholder="Товар" className="p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <input required type="number" placeholder="Цена (лари)" className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} />
          <textarea placeholder="Комментарий" className="w-full p-2 border rounded resize-none outline-none focus:ring-2 focus:ring-blue-500" rows={2} value={formData.comment} onChange={e => setFormData({...formData, comment: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <select className="p-2 border rounded bg-blue-50 outline-none focus:ring-2 focus:ring-blue-500" value={formData.recipient} onChange={e => setFormData({...formData, recipient: e.target.value})}>
              <option value={ownerName}>{ownerName}</option>
              {partners.filter(p => p.isActive).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
            
            <select className="p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500" value={formData.carrier} onChange={e => setFormData({...formData, carrier: e.target.value})}>
              {allAvailableCarriers.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input type="date" className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} />
            <input required type="date" className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500" value={formData.expectedDate} onChange={e => setFormData({...formData, expectedDate: e.target.value})} />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded font-bold mt-2 hover:bg-blue-700 transition-colors">Сохранить</button>
        </form>
      )}

      {/* СПИСОК АКТИВНЫХ ЗАКАЗОВ */}
      <div>
        <h2 className="text-xl font-bold mb-4">Активные заказы</h2>
        <div className="space-y-3">
          {activeParcels.map((p) => {
            const isRisky = activeParcels.filter(cp => cp.carrier === p.carrier && cp.recipient === p.recipient && cp.expectedDate && Math.abs(new Date(cp.expectedDate).getTime() - new Date(p.expectedDate).getTime()) / 86400000 <= 4).reduce((sum, cp) => sum + cp.value, 0) >= 300
            
            const hasCarrierAlert = alerts.some(a => a.relatedHub === p.carrier);

            return (
              <div key={p.id} className={`p-4 rounded-xl border flex flex-col gap-2 ${isRisky ? 'bg-red-50 border-red-300' : 'bg-white'} ${hasCarrierAlert ? 'border-l-4 border-l-amber-500' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900">{p.name}</p>
                    <div className="flex gap-2 text-sm font-medium">
                      <span className="text-gray-500 border rounded px-1 bg-white">{p.trackCode}</span>
                      <span className="bg-gray-200 px-2 rounded flex items-center gap-1">
                        {p.carrier} {hasCarrierAlert && '⚠️'}
                      </span>
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold border bg-white mt-1">👤 {p.recipient}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900">{p.value} ₾</p>
                    <span className="text-xs font-bold px-2 py-1 rounded mt-1 inline-block border">{p.expectedDate ? new Date(p.expectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : 'Без даты'}</span>
                  </div>
                </div>
                {p.comment && <div className="text-sm text-gray-600 bg-white/50 p-2 rounded italic border">💬 {p.comment}</div>}
                
                <div className="flex justify-between items-center border-t pt-3 mt-1">
                  <div className="flex gap-2">
                    <button title="Отправить в архив" onClick={() => updateStatus(p, 'доставлено')} className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded font-bold transition-colors">✔ Получил</button>
                    <button title="Отправить в архив" onClick={() => updateStatus(p, 'утеряно')} className="text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-2 py-1 rounded font-bold transition-colors">Утеряно</button>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleEdit(p)} className="text-sm text-blue-600 hover:underline">Изменить</button>
                    <button onClick={() => handleDelete(p.id)} className="text-sm text-gray-400 hover:text-red-600 transition-colors">Удалить</button>
                  </div>
                </div>
              </div>
            )
          })}
          {activeParcels.length === 0 && <p className="text-center text-gray-500 py-8">Нет активных заказов</p>}
        </div>
      </div>
    </div>
  )
}