"use client";
import { useEffect, useState } from 'react';

export default function WeatherWidget() {
    const [weather, setWeather] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchWeather = async () => {
        try {
            const res = await fetch('/api/weather');
            
            // Проверяем, успешен ли ответ сервера (статус 200-299)
            if (!res.ok) {
                throw new Error('Ошибка сервера при загрузке погоды');
            }

            const data = await res.json();
            setWeather(data);
            setError(false);
        } catch (err) {
            console.error("Ошибка загрузки погоды", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeather();
        const interval = setInterval(fetchWeather, 600000); // 10 минут
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-4 text-sm text-gray-500">Загрузка погоды...</div>;
    
    // Если сервер упал, показываем аккуратное сообщение вместо поломки всей страницы
    if (error) return <div className="p-4 text-sm text-red-500 bg-red-50 rounded-lg border border-red-100">Не удалось загрузить данные о погоде</div>;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            {weather.map((w) => (
                <div key={w.name} className="flex flex-col items-center">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{w.name}</span>
                    <span className="text-2xl font-bold text-gray-800">{w.temp}°C</span>
                    <span className="text-[10px] text-gray-500 capitalize">{w.desc}</span>
                </div>
            ))}
        </div>
    );
}