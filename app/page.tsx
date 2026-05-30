import { redirect } from 'next/navigation'

export default function Home() {
  // При заходе на главную, мы сразу кидаем пользователя на /dashboard.
  // А наш файл middleware.ts уже сам разберется:
  // Если токен есть - пустит. Если нет - перекинет на /login.
  redirect('/dashboard')
}