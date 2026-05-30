'use client'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface Parcel {
  id: string;
  trackCode: string;
  name: string;
  value: number;
  carrier: string;
  expectedDate?: string;
  purchaseDate?: string;
  recipient: string;
  comment?: string;
  status: string;
}

interface Partner {
  id: string;
  name: string;
  isActive: boolean;
}

interface Carrier {
  id: string;
  name: string;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  severity: string;
  relatedHub?: string;
}

export default function DashboardPage() {
  const router = useRouter()
  
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [userCarriers, setUserCarriers] = useState<Carrier[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [ownerName, setOwnerName] = useState<string>('Владелец')
  
  const [isLoading, setIsLoading] = useState(true)
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
          ...p, 
          value: Number(p.value),
          recipient: p.recipient === 'Я' ? (dataPartners.ownerName || 'Владелец') : p.recipient
        })))
      }
    } catch (error) { 
      console.error('Ошибка при загрузке:', error) 
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleLogout = async () => { 
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login') 
  }
  
  // Оптимизированные вычисления через useMemo
  const activeParcels = useMemo(() => parcels.filter(p => p.status !== 'доставлено' && p.status !== 'утеряно'), [parcels])
  const deliveredCount = useMemo(() => parcels.filter(p => p.status === 'доставлено').length, [parcels])
  const lostCount = useMemo(() => parcels.filter(p => p.status === 'утеряно').length, [parcels])
  const getActiveCount = (name: string) => activeParcels.filter(p => p.recipient === name).length

  const baseCarriers = ['Georgian Post', 'Camex', 'USA2GEORGIA']
  const allAvailableCarriers = [...baseCarriers, ...userCarriers.map(c => c.name)]

  /**
   * AI-Движок расчета таможенного риска (0-100%).
   */
  const getParcelRiskPercentage = (current: any, isFromForm = false) => {
    const val = parseFloat(current.value) || 0;
    if (val >= 300) return 100;

    let riskPercentage = 0;
    if (val >= 200) riskPercentage += 35;
    else if (val >= 100) riskPercentage += 15;
    else riskPercentage += 5;

    if (!current.expectedDate) return riskPercentage;
    const currentFieldsTime = new Date(current.expectedDate).getTime();
    if (isNaN(currentFieldsTime)) return riskPercentage;

    let hasCarrierCollision = false;
    let hasDifferentCarrierCollision = false;
    let hasShopCollision = false;

    activeParcels.forEach(p => {
      if (!isFromForm && p.id === current.id) return;
      if (isFromForm && editingParcelId && p.id === editingParcelId) return;
      if (!p.expectedDate) return;

      const pTime = new Date(p.expectedDate).getTime();
      const dayDiff = Math.abs(pTime - currentFieldsTime) / 86400000;

      if (dayDiff <= 4 && p.recipient === current.recipient) {
        if (p.carrier === current.carrier) hasCarrierCollision = true;
        else hasDifferentCarrierCollision = true;
        if (p.name.toLowerCase() === current.name.toLowerCase()) hasShopCollision = true;
      }
    });

    if (hasCarrierCollision) riskPercentage += 35;
    if (hasDifferentCarrierCollision) riskPercentage += 15;
    if (hasShopCollision) riskPercentage += 15;

    return Math.min(riskPercentage, 100);
  }

  // Визуальный бейдж процента риска
  const getRiskBadge = (percent: number) => {
    if (percent >= 61) return <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-lg text-xs font-black uppercase">HIGH RISK ({percent}%)</span>
    if (percent >= 31) return <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg text-xs font-black uppercase">MEDIUM RISK ({percent}%)</span>
    return <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg text-xs font-black uppercase">LOW RISK ({percent}%)</span>
  }

  // AI-Оптимизация: Вычисляем совет и риск 1 раз при изменении формы
  const { bestPartnerName, currentFormRisk } = useMemo(() => {
    const formValue = parseFloat(formData.value) || 0;
    const hasDate = formData.expectedDate !== '' && !isNaN(new Date(formData.expectedDate).getTime());
    
    let best: string | null = null;
    const formRisk = getParcelRiskPercentage(formData, true);
    
    if (formValue > 0 && hasDate && formData.carrier) {
      const allCandidates = [ownerName, ...partners.filter(p => p.isActive).map(p => p.name)];
      let minRisk = Infinity;

      for (const candidate of allCandidates) {
        const mockParcel = { ...formData, recipient: candidate };
        const projectedRisk = getParcelRiskPercentage(mockParcel, true);
        
        if (projectedRisk < minRisk) {
          minRisk = projectedRisk;
          best = candidate;
        }
      }
      if (minRisk >= formRisk) best = null; // Если замена не помогает, не советуем
    }

    return { bestPartnerName: best, currentFormRisk: formRisk };
  }, [formData, activeParcels, partners, ownerName, editingParcelId])

  const handleParcelSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingParcelId ? `/api/parcels/${editingParcelId}` : '/api/parcels'
    const method = editingParcelId ? 'PUT' : 'POST'
    try {
      const res = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({
          ...formData,
          value: parseFloat(formData.value) || 0
        }) 
      })
      if (res.ok) { 
        fetchData()
        resetForm()
      } else {
        alert('Ошибка при сохранении')
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

  const handleEdit = (p: Parcel) => {
    setEditingParcelId(p.id)
    setFormData({
      trackCode: p.trackCode,
      name: p.name,
      value: String(p.value), // Явный перевод в строку
      carrier: p.carrier,
      expectedDate: p.expectedDate ? p.expectedDate.split('T')[0] : '',
      purchaseDate: p.purchaseDate ? p.purchaseDate.split('T')[0] : '',
      recipient: p.recipient,
      comment: p.comment || '',
      status: p.status || 'ожидается'
    })
    setIsFormVisible(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Безопасный ввод цифр "на лету"
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(',', '.')
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setFormData(prev => ({ ...prev, value: raw }))
    }
  }

  // Окончательное банковское округление при потере фокуса полем цены
  const handleValueBlur = () => {
    const numValue = parseFloat(formData.value);
    if (!isNaN(numValue)) {
      const safeNum = Math.round((numValue + Number.EPSILON) * 100) / 100;
      setFormData(prev => ({ ...prev, value: safeNum.toFixed(2) }));
    }
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

  const updateStatus = async (p: Parcel, newStatus: string) => {
    await fetch(`/api/parcels/${p.id}`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ ...p, status: newStatus }) 
    })
    fetchData()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50 text-slate-500 font-medium">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p>Загрузка AI-ядра...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* ИСПРАВЛЕННАЯ ШАПКА: Banderoli.AI + Кабинет + Архив */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Banderoli<span className="text-indigo-600">.AI</span></h1>
          <div className="flex flex-wrap gap-3">
            <Link href="/analytics" className="bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors flex items-center gap-2">
              📊 Аналитика рисков
            </Link>
            <Link href="/profile" className="bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors">
              Кабинет
            </Link>
            <Link href="/archive" className="bg-purple-50 text-purple-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-100 transition-colors flex items-center gap-2">
              📦 Архив
              {(deliveredCount > 0 || lostCount > 0) && (
                <div className="flex gap-1 ml-1">
                  {deliveredCount > 0 && <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">{deliveredCount}</span>}
                  {lostCount > 0 && <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">{lostCount}</span>}
                </div>
              )}
            </Link>
            <button onClick={handleLogout} className="bg-rose-50 text-rose-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-100 transition-colors">
              Выйти
            </button>
          </div>
        </div>

        {/* УВЕДОМЛЕНИЯ ХАБОВ */}
        {alerts.length > 0 && (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className={`p-4 rounded-2xl border flex items-start gap-4 shadow-sm ${alert.severity === 'CRITICAL' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                <div className="text-2xl mt-0.5">{alert.type === 'WEATHER' ? '⛈️' : '🏭'}</div>
                <div>
                  <h3 className="font-bold text-sm mb-1">Оповещение системы</h3>
                  <p className="text-sm opacity-90">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ГРУППА ПАРТНЕРОВ */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800">Управление лимитами</h2>
            {!isFormVisible && (
              <button onClick={() => setIsFormVisible(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all transform active:scale-95">
                + Добавить посылку
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative group cursor-default">
              <div className={`px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors ${bestPartnerName === ownerName ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                {ownerName}
              </div>
              {getActiveCount(ownerName) > 0 && (
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                  {getActiveCount(ownerName)}
                </span>
              )}
            </div>
            
            {partners.filter(p => p.isActive).map(p => (
              <div key={p.id} className="relative group cursor-default">
                <div className={`px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors ${bestPartnerName === p.name ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600'}`}>
                  {p.name}
                </div>
                {getActiveCount(p.name) > 0 && (
                  <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                    {getActiveCount(p.name)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* АЛЕРТ РИСКА (В ПРОЦЕНТАХ) */}
        {isFormVisible && currentFormRisk >= 31 && (
          <div className={`p-5 rounded-2xl border shadow-sm space-y-2 animate-fade-in ${currentFormRisk >= 61 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
            <p className="font-extrabold text-lg flex items-center gap-2">
              🚨 AI-Движок обнаружил вероятность коллизии ({currentFormRisk}%)
            </p>
            <div className="flex flex-col gap-2 mt-2">
              {bestPartnerName && (
                <div className="bg-white px-4 py-2.5 rounded-xl text-sm font-medium border border-rose-100 shadow-sm">
                  👥 Рекомендуем партнера для снижения риска: <span className="font-bold text-emerald-600">"{bestPartnerName}"</span>
                </div>
              )}
              {currentFormRisk >= 100 && (
                <div className="bg-white px-4 py-2.5 rounded-xl text-sm font-medium border border-rose-100 shadow-sm">
                  ⚠️ Лимит в 300 ₾ превышен. Гарантированная растаможка.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ФОРМА */}
        {isFormVisible && (
          <form onSubmit={handleParcelSubmit} className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-xl relative animate-fade-in">
            <button type="button" onClick={resetForm} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">✕</button>
            
            <h2 className="font-extrabold text-xl text-slate-800 mb-6">{editingParcelId ? 'Редактировать посылку' : 'Анализ новой посылки'}</h2>
            
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Трек-код</label>
                  <input
                    required
                    placeholder="Например: 1Z9999999999999999"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium"
                    value={formData.trackCode}
                    onChange={e => setFormData({...formData, trackCode: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Товар</label>
                  <input
                    required
                    placeholder="Что внутри?"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Стоимость (₾)</label>
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-lg font-bold text-slate-900"
                  value={formData.value}
                  onChange={handleValueChange}
                  onBlur={handleValueBlur}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Детали логистики</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <select
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium cursor-pointer"
                    value={formData.recipient}
                    onChange={e => setFormData({...formData, recipient: e.target.value})}
                  >
                    <option value={ownerName}>{ownerName} (Владелец)</option>
                    {partners.filter(p => p.isActive).map(p => <option key={p.id} value={p.name}>{p.name} (Партнер)</option>)}
                  </select>
                  <select
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium cursor-pointer"
                    value={formData.carrier}
                    onChange={e => setFormData({...formData, carrier: e.target.value})}
                  >
                    {allAvailableCarriers.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Дата покупки</label>
                  <input
                    type="date"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium text-slate-700"
                    value={formData.purchaseDate}
                    onChange={e => setFormData({...formData, purchaseDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Ожидаемая дата *</label>
                  <input
                    required
                    type="date"
                    className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm font-bold text-emerald-900"
                    value={formData.expectedDate}
                    onChange={e => setFormData({...formData, expectedDate: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Заметка</label>
                <textarea
                  placeholder="Необязательный комментарий..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl resize-none outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                  rows={2}
                  value={formData.comment}
                  onChange={e => setFormData({...formData, comment: e.target.value})}
                />
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold text-lg hover:bg-indigo-700 hover:shadow-lg transition-all transform active:scale-[0.99] mt-4">
                {editingParcelId ? 'Сохранить изменения' : 'Запустить мониторинг рисков'}
              </button>
            </div>
          </form>
        )}

        {/* АКТИВНЫЕ ПОСЫЛКИ */}
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-5 ml-1">Грузы в транзите</h2>
          <div className="space-y-4">
            {activeParcels.map((p) => {
              const riskPercent = getParcelRiskPercentage(p);
              const isRisky = riskPercent >= 61;
              const hasCarrierAlert = alerts.some(a => a.relatedHub === p.carrier)

              return (
                <div key={p.id} className={`bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all group relative overflow-hidden ${isRisky ? 'border-rose-300' : 'border-slate-100'} ${hasCarrierAlert ? 'pl-6' : ''}`}>
                  
                  {hasCarrierAlert && <div className="absolute left-0 top-0 bottom-0 w-2 bg-amber-400"></div>}

                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="space-y-3 flex-1 w-full">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-bold text-lg text-slate-900 leading-none">{p.name}</h3>
                        {getRiskBadge(riskPercent)}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg select-all">{p.trackCode}</span>
                        <span className="text-indigo-700 bg-indigo-50 border border-indigo-100 font-medium px-2 py-1 rounded-lg flex items-center gap-1">
                          🏢 {p.carrier} {hasCarrierAlert && '⚠️'}
                        </span>
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 font-bold px-2 py-1 rounded-lg">
                          👤 {p.recipient}
                        </span>
                      </div>
                      
                      {p.comment && <div className="text-sm text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 italic">💬 {p.comment}</div>}
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto md:text-right gap-2 border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0">
                      <div className="font-extrabold text-2xl text-slate-900">{p.value.toFixed(2)} ₾</div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-lg">
                        {p.expectedDate ? new Date(p.expectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'Без даты'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap justify-between items-center border-t border-slate-100 pt-4 mt-4 gap-4">
                    <div className="flex gap-2 w-full md:w-auto">
                      <button onClick={() => updateStatus(p, 'доставлено')} className="flex-1 md:flex-none text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 px-4 py-2 rounded-xl font-bold transition-all">
                        ✔ Получил
                      </button>
                      <button onClick={() => updateStatus(p, 'утеряно')} className="flex-1 md:flex-none text-xs bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-200 px-4 py-2 rounded-xl font-bold transition-all">
                        Утеряно
                      </button>
                    </div>
                    
                    <div className="flex gap-4 ml-auto">
                      <button onClick={() => handleEdit(p)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">Изменить</button>
                      <button onClick={() => handleDelete(p.id)} className="text-sm font-semibold text-slate-400 hover:text-rose-600 transition-colors">Удалить</button>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {activeParcels.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 border-dashed">
                <div className="text-4xl mb-3">📦</div>
                <h3 className="font-bold text-slate-700">Пока нет активных посылок</h3>
                <p className="text-sm text-slate-500 mt-1">Нажмите «Добавить посылку», чтобы создать первую.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}