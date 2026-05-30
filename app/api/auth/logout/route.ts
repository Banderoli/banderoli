import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Создаем успешный ответ
    const response = NextResponse.json({ success: true, message: 'Вы успешно вышли из системы' })
    
    // Удаляем куку с токеном авторизации
    response.cookies.delete('token')
    
    return response
  } catch (error) {
    console.error('Ошибка при выходе:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}