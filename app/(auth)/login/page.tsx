'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      if (res.ok) {
        router.push('/dashboard')
      } else {
        const data = await res.json()
        setError(data.error || 'Ошибка входа. Проверьте логин и пароль.')
      }
    } catch (err) {
      setError('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold text-center text-gray-800">Banderoli</h1>
        
        {error && (
          <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded text-sm text-center font-medium">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <input required type="email" placeholder="Email" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={email} onChange={e => setEmail(e.target.value)} />
          <input required type="password" placeholder="Пароль" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        
        {/* НОВАЯ ССЫЛКА НА ВОССТАНОВЛЕНИЕ */}
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline font-medium">
            Забыли пароль?
          </Link>
        </div>

        <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors mt-2">
          {loading ? 'Вход...' : 'Войти'}
        </button>
        
        <div className="text-center text-sm mt-4 text-gray-600">
          Нет аккаунта? <Link href="/register" className="text-blue-600 hover:underline font-bold">Зарегистрироваться</Link>
        </div>
      </form>
    </div>
  )
}