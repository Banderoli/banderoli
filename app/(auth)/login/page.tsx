'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Package, ShieldCheck, Users, ArrowRight, Loader2, 
  Mail, Lock, User, AlertCircle 
} from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  
  // ── СОСТОЯНИЯ UI И ДАННЫХ ──
  const [isLogin, setIsLogin] = useState(true) // true = Вход, false = Регистрация
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── ПОЛЯ ФОРМЫ ──
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  // ── РЕАЛЬНАЯ ЛОГИКА АВТОРИЗАЦИИ И РЕГИСТРАЦИИ ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Определяем, куда отправлять запрос в зависимости от вкладки
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      
      // Формируем тело запроса
      const bodyPayload = isLogin 
        ? { email, password } 
        : { name, email, password }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      })

      if (res.ok) {
        // Успех! Перенаправляем в кабинет
        router.push('/dashboard')
      } else {
        // Обработка ошибки с сервера
        const data = await res.json().catch(() => ({}))
        setError(data.error || (isLogin ? 'Ошибка входа. Проверьте логин и пароль.' : 'Ошибка регистрации. Возможно, email уже занят.'))
      }
    } catch (err) {
      setError('Ошибка сети. Проверьте подключение к интернету.')
    } finally {
      setLoading(false)
    }
  }

  // Универсальный класс для полей ввода
  const inputClass = "w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-slate-900 placeholder:text-slate-400 outline-none"

  return (
    <>
      <style>{`
        input {
          color: #0f172a !important;
          -webkit-text-fill-color: #0f172a !important;
          opacity: 1 !important;
        }
        input::placeholder {
          color: #94a3b8 !important;
          -webkit-text-fill-color: #94a3b8 !important;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px) }
          to   { opacity: 1; transform: none }
        }
        .fade-up { animation: fadeUp 0.6s ease both; }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
      `}</style>

      <div className="min-h-screen flex bg-white">
        
        {/* ── ЛЕВАЯ ЧАСТЬ: ПРОДАЮЩИЙ БЛОК (Скрыт на смартфонах) ── */}
        <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 lg:p-16 xl:p-20">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-600/20 blur-[120px]"></div>
            <div className="absolute top-[60%] -right-[20%] w-[60%] h-[60%] rounded-full bg-purple-600/20 blur-[100px]"></div>
          </div>

          <div className="relative z-10 flex items-center gap-3 fade-up">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg">
              <Package size={28} />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">Banderoli</span>
          </div>

          <div className="relative z-10 my-auto fade-up delay-100">
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.15] mb-6 tracking-tight">
              Контролируйте свои <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                посылки без стресса
              </span>
            </h1>
            <p className="text-lg text-slate-300 font-medium max-w-md mb-12 leading-relaxed">
              Интеллектуальный трекинг, авто-расчет таможенных лимитов Грузии и удобное управление получателями в одном окне.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl flex-shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm mb-1">Таможенный радар</h3>
                  <p className="text-slate-400 text-xs font-medium leading-relaxed">Автоматический контроль лимитов (300 ₾ / 30 кг). Забудьте о неожиданных пошлинах.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-xl flex-shrink-0">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm mb-1">Умное распределение</h3>
                  <p className="text-slate-400 text-xs font-medium leading-relaxed">Легко добавляйте членов семьи и друзей для распределения деклараций.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-4 fade-up delay-200">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-xs font-bold text-white z-${5-i}`}>
                  <User size={16} className="text-slate-400"/>
                </div>
              ))}
            </div>
            <p className="text-xs font-bold text-slate-400">
              <span className="text-white">+2,000</span> пользователей <br/>уже с нами
            </p>
          </div>
        </div>

        {/* ── ПРАВАЯ ЧАСТЬ: ФОРМА АВТОРИЗАЦИИ ── */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-slate-50 lg:bg-white">
          
          {/* Логотип для мобильных устройств */}
          <div className="absolute top-8 left-6 sm:left-12 lg:hidden flex items-center gap-2">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md">
              <Package size={20} />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">Banderoli</span>
          </div>

          <div className="w-full max-w-md fade-up delay-300">
            
            {/* Переключатель Вход / Регистрация */}
            <div className="flex p-1 bg-slate-100/80 rounded-2xl mb-8 border border-slate-200/50 backdrop-blur-sm">
              <button 
                type="button"
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Вход
              </button>
              <button 
                type="button"
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${!isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Регистрация
              </button>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
                {isLogin ? 'С возвращением!' : 'Создайте аккаунт'}
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                {isLogin ? 'Введите свои данные для доступа к дашборду.' : 'Начните экономить время и деньги на доставке.'}
              </p>
            </div>

            {/* ── БЛОК ОШИБКИ ИЗ ТВОЕГО КОДА ── */}
            {error && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 animate-fade-in">
                <AlertCircle size={20} className="flex-shrink-0" />
                <p className="text-sm font-bold leading-tight">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {!isLogin && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    required 
                    placeholder="Ваше Имя" 
                    className={inputClass}
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="email" 
                  required 
                  placeholder="Email адрес" 
                  className={inputClass}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="password" 
                  required 
                  placeholder="Пароль" 
                  className={inputClass}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              {/* ── ССЫЛКА НА ВОССТАНОВЛЕНИЕ ПАРОЛЯ ИЗ ТВОЕГО КОДА ── */}
              {isLogin && (
                <div className="flex justify-end pt-1">
                  <Link href="/forgot-password" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                    Забыли пароль?
                  </Link>
                </div>
              )}

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl font-black transition-all shadow-lg hover:shadow-indigo-200/50 disabled:opacity-70 active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? 'Войти в систему' : 'Зарегистрироваться')}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </div>
            </form>

            {!isLogin && (
              <p className="text-xs text-center text-slate-400 font-medium mt-6 leading-relaxed">
                Нажимая «Зарегистрироваться», вы соглашаетесь с нашими <br/>
                <a href="#" className="text-indigo-600 hover:underline">Условиями использования</a> и <a href="#" className="text-indigo-600 hover:underline">Политикой конфиденциальности</a>.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}