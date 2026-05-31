'use client'
import { useState, useEffect, useMemo } from 'react'

interface Parcel {
  id: string;
  trackCode: string;
  name: string;
  shop?: string;
  weight?: string | number;
  value: number;
  carrier: string;
  expectedDate?: string;
  purchaseDate?: string;
  recipient: string;
  comment?: string;
  status: string;
}

interface Partner { id: string; name: string; isActive: boolean; }
interface Carrier { id: string; name: string; }
interface Alert { id: string; type: string; message: string; severity: string; relatedHub?: string; }

export default function DashboardPage() {
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [userCarriers, setUserCarriers] = useState<Carrier[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [ownerName, setOwnerName] = useState<string>('Владелец')
  
  const [isLoading, setIsLoading] = useState(true)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [editingParcelId, setEditingParcelId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    trackCode: '', name: '', shop: '', weight: '', value: '', carrier: 'Georgian Post', 
    expectedDate: '', purchaseDate: '', recipient: '', comment: '', status: 'ожидается'
  })

  const fetchData = async () => {
    try {
      const [resParcels, resPartners, resCarriers, resAlerts] = await Promise.all([
        fetch('/api/parcels/get'), fetch('/api/partners'), fetch('/api/carriers'), fetch('/api/alerts')
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
    } catch (error) { console.error(error) } finally { setIsLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const activeParcels = useMemo(() => parcels.filter(p => p.status !== 'доставлено' && p.status !== 'утеряно'), [parcels])
  const getActiveCount = (name: string) => activeParcels.filter(p => p.recipient === name).length
  const allAvailableCarriers = ['Georgian Post', 'Camex', 'USA2GEORGIA', ...userCarriers.map(c => c.name)]

  const getParcelRiskPercentage = (current: any, isFromForm = false) => {
    const val = parseFloat(current.value) || 0;
    const weight = parseFloat(current.weight) || 0;
    if (val >= 300 || weight >= 30) return 100;

    let risk = 0;
    if (val >= 200) risk += 35; else if (val >= 100) risk += 15; else risk += 5;
    if (!current.expectedDate) return risk;
    
    const currentFieldsTime = new Date(current.expectedDate).getTime();
    if (isNaN(currentFieldsTime)) return risk;

    let hasCarrierCollision = false, hasShopCollision = false;

    activeParcels.forEach(p => {
      if (!isFromForm && p.id === current.id) return;
      if (isFromForm && editingParcelId && p.id === editingParcelId) return;
      if (!p.expectedDate) return;

      const dayDiff = Math.abs(new Date(p.expectedDate).getTime() - currentFieldsTime) / 86400000;
      if (dayDiff <= 4 && p.recipient === current.recipient) {
        if (p.carrier === current.carrier) hasCarrierCollision = true;
        if (p.shop && current.shop && p.shop.toLowerCase() === current.shop.toLowerCase()) hasShopCollision = true;
      }
    });

    if (hasCarrierCollision) risk += 35;
    if (hasShopCollision) risk += 20;

    return Math.min(risk, 100);
  }

  const getRiskBadge = (percent: number) => {
    if (percent >= 61) return <span className="bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-lg text-xs font-black uppercase shadow-sm">HIGH RISK ({percent}%)</span>
    if (percent >= 31) return <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg text-xs font-black uppercase shadow-sm">MEDIUM RISK ({percent}%)</span>
    return <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg text-xs font-black uppercase shadow-sm">LOW RISK ({percent}%)</span>
  }

  const { bestPartnerName, currentFormRisk } = useMemo(() => {
    const formValue = parseFloat(formData.value) || 0;
    const hasDate = formData.expectedDate !== '' && !isNaN(new Date(formData.expectedDate).getTime());
    let best: string | null = null;
    const formRisk = getParcelRiskPercentage(formData, true);
    
    if (formValue > 0 && hasDate && formData.carrier) {
      const allCandidates = [ownerName, ...partners.filter(p => p.isActive).map(p => p.name)];
      let minRisk = Infinity;
      for (const candidate of allCandidates) {
        const projectedRisk = getParcelRiskPercentage({ ...formData, recipient: candidate }, true);
        if (projectedRisk < minRisk) { minRisk = projectedRisk; best = candidate; }
      }
      if (minRisk >= formRisk) best = null;
    }
    return { bestPartnerName: best, currentFormRisk: formRisk };
  }, [formData, activeParcels, partners, ownerName, editingParcelId])

  // Банковское округление (безопасный ввод)
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(',', '.')
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setFormData(prev => ({ ...prev, value: raw }))
    }
  }

  // Окончательное банковское округление при потере фокуса
  const handleValueBlur = () => {
    const numValue = parseFloat(formData.value);
    if (!isNaN(numValue)) {
      const safeNum = Math.round((numValue + Number.EPSILON) * 100) / 100;
      setFormData(prev => ({ ...prev, value: safeNum.toFixed(2) }));
    }
  }

  const handleParcelSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingParcelId ? `/api/parcels/${editingParcelId}` : '/api/parcels'
    try {
      const res = await fetch(url, { 
        method: editingParcelId ? 'PUT' : 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ...formData, value: parseFloat(formData.value) || 0 }) 
      })
      if (res.ok) { fetchData(); resetForm(); } 
      else alert('Ошибка при сохранении')
    } catch (err) { alert('Ошибка сети') }
  }

  const resetForm = () => {
    setFormData({ trackCode: '', name: '', shop: '', weight: '', value: '', carrier: 'Georgian Post', expectedDate: '', purchaseDate: '', recipient: ownerName, comment: '', status: 'ожидается' })
    setEditingParcelId(null); setIsFormVisible(false);
  }

  // Строгая загрузка всех полей при редактировании
  const handleEdit = (p: Parcel) => {
    setEditingParcelId(p.id)
    setFormData({ 
      trackCode: p.trackCode || '',
      name: p.name || '',
      shop: p.shop || '', 
      weight: p.weight ? String(p.weight) : '',
      value: String(p.value || '0'), 
      carrier: p.carrier || 'Georgian Post',
      expectedDate: p.expectedDate ? p.expectedDate.split('T')[0] : '', 
      purchaseDate: p.purchaseDate ? p.purchaseDate.split('T')[0] : '', 
      recipient: p.recipient || ownerName,
      comment: p.comment || '',
      status: p.status || 'ожидается'
    })
    setIsFormVisible(true); 
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту посылку?')) return
    const res = await fetch(`/api/parcels/${id}`, { method: 'DELETE' })
    if (res.ok) fetchData()
  }

  const updateStatus = async (p: Parcel, newStatus: string) => {
    await fetch(`/api/parcels/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, status: newStatus }) })
    fetchData()
  }

  if (isLoading) return <div className="flex justify-center items-center min-h-[60vh] text-slate-500"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>

  return (
    <div className="py-6 space-y-6 animate-fade-in">
      
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className={`p-4 rounded-2xl border flex items-start gap-4 shadow-sm ${alert.severity === 'CRITICAL' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
              <div className="text-2xl mt-0.5">{alert.type === 'WEATHER' ? '⛈️' : '🏭'}</div>
              <div><h3 className="font-bold text-sm mb-1">Системное предупреждение</h3><p className="text-sm opacity-90">{alert.message}</p></div>
            </div>
          ))}
        </div>
      )}

      {/* КАРТОЧКИ ПАРТНЕРОВ НАВЕРХУ */}
      <div className="flex flex-wrap gap-4 pb-2">
        {[ownerName, ...partners.filter(p => p.isActive).map(p => p.name)].map(name => (
          <div key={name} className="relative group cursor-default">
            <div className={`px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors ${bestPartnerName === name ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-700 shadow-sm'}`}>
              {name}
            </div>
            {getActiveCount(name) > 0 && (
              <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-sm">{getActiveCount(name)}</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm gap-4">
        <h2 className="text-xl font-extrabold text-slate-800">Активный транзит</h2>
        {!isFormVisible && (
          <button onClick={() => setIsFormVisible(true)} className="w-full md:w-auto bg-indigo-600 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition-all active:scale-95">
            + Добавить посылку
          </button>
        )}
      </div>

      {isFormVisible && currentFormRisk >= 31 && (
        <div className={`p-5 rounded-2xl border shadow-sm space-y-2 ${currentFormRisk >= 61 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          <p className="font-extrabold text-lg">🚨 Риск коллизии ({currentFormRisk}%)</p>
          {bestPartnerName && <div className="bg-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm">👥 Рекомендуем получателя: <span className="font-bold text-emerald-600">{bestPartnerName}</span></div>}
          {currentFormRisk >= 100 && <div className="bg-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm text-rose-600">⚠️ Лимит превышен (Цена &gt; 300₾ или Вес &gt; 30кг). Гарантированная растаможка.</div>}
        </div>
      )}

      {isFormVisible && (
        <form onSubmit={handleParcelSubmit} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xl relative">
          <button type="button" onClick={resetForm} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
          <h2 className="font-extrabold text-2xl text-slate-800 mb-6">{editingParcelId ? 'Редактировать груз' : 'Новый груз'}</h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <input required placeholder="Трек-код" className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium" value={formData.trackCode} onChange={e => setFormData({...formData, trackCode: e.target.value})} />
              <input required placeholder="Наименование (например: Кроссовки)" className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              
              <input placeholder="Магазин / Отправитель (Amazon, Zara...)" className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium" value={formData.shop} onChange={e => setFormData({...formData, shop: e.target.value})} />
              <input type="number" step="0.01" placeholder="Вес в кг (необязательно)" className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
              
              {/* Поле стоимости со строгим округлением */}
              <input required type="text" inputMode="decimal" placeholder="Стоимость (₾)" className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-lg" value={formData.value} onChange={handleValueChange} onBlur={handleValueBlur} />
              
              <select className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium cursor-pointer" value={formData.recipient} onChange={e => setFormData({...formData, recipient: e.target.value})}>
                <option value={ownerName}>{ownerName} (Владелец)</option>
                {partners.filter(p => p.isActive).map(p => <option key={p.id} value={p.name}>{p.name} (Партнер)</option>)}
              </select>
              
              <select className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium cursor-pointer" value={formData.carrier} onChange={e => setFormData({...formData, carrier: e.target.value})}>
                {allAvailableCarriers.map(name => <option key={name} value={name}>{name}</option>)}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Покупка</div>
                  <input type="date" className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 w-full text-sm" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-600 uppercase mb-1 ml-1">Прибытие *</div>
                  <input required type="date" className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-900 w-full text-sm" value={formData.expectedDate} onChange={e => setFormData({...formData, expectedDate: e.target.value})} />
                </div>
              </div>
            </div>
            
            <button type="submit" className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold text-lg hover:bg-indigo-700 hover:shadow-lg transition-all transform active:scale-[0.99] mt-4">
              {editingParcelId ? 'Сохранить изменения' : 'Запустить AI-мониторинг'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {activeParcels.map((p) => {
          const riskPercent = getParcelRiskPercentage(p);
          const isRisky = riskPercent >= 61;
          const hasCarrierAlert = alerts.some(a => a.relatedHub === p.carrier)

          return (
            <div key={p.id} className={`bg-white rounded-3xl p-6 border shadow-sm hover:shadow-md transition-all relative overflow-hidden ${isRisky ? 'border-rose-300' : 'border-slate-100'}`}>
              {hasCarrierAlert && <div className="absolute left-0 top-0 bottom-0 w-2 bg-amber-400"></div>}

              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-3 flex-1 w-full">
                  <div className="flex items-center gap-3">
                    <h3 className="font-extrabold text-xl text-slate-900">{p.name}</h3>
                    {getRiskBadge(riskPercent)}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="font-mono bg-slate-100 px-2.5 py-1 rounded-lg select-all">{p.trackCode}</span>
                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-semibold">🏢 {p.carrier}</span>
                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-semibold">👤 {p.recipient}</span>
                    {/* НАЗВАНИЕ МАГАЗИНА */}
                    {p.shop && <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg font-semibold">🛒 {p.shop}</span>}
                  </div>
                </div>

                <div className="flex flex-row md:flex-col justify-between items-center md:items-end w-full md:w-auto gap-1">
                  <div className="font-black text-2xl text-slate-900">{p.value.toFixed(2)} ₾</div>
                  {/* ВЕС РЯДОМ С ЦЕНОЙ */}
                  {p.weight && (
                    <div className="text-sm font-bold text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                      ⚖️ {p.weight} кг
                    </div>
                  )}
                  <div className="text-xs font-bold text-slate-500 uppercase bg-slate-100 px-3 py-1.5 rounded-lg mt-1">
                    {p.expectedDate ? new Date(p.expectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'Без даты'}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap justify-between items-center border-t border-slate-100 pt-5 mt-5 gap-4">
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => updateStatus(p, 'доставлено')} className="flex-1 md:flex-none text-xs bg-emerald-500 text-white hover:bg-emerald-600 px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm">✔ Получил</button>
                  <button onClick={() => updateStatus(p, 'утеряно')} className="flex-1 md:flex-none text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all">Утеряно</button>
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
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
            <div className="text-5xl mb-4 opacity-50">📦</div>
            <h3 className="font-bold text-lg text-slate-700">Транзитов пока нет</h3>
            <p className="text-slate-500 mt-2">Добавьте посылку, чтобы начать мониторинг рисков.</p>
          </div>
        )}
      </div>
    </div>
  )
}