import { NextResponse } from 'next/server';

// Обновленный список транзитных хабов (заменили Тбилиси на Франкфурт)
const HUBS = [
    { name: "Франкфурт", lat: 50.1109, lon: 8.6821 },
    { name: "Шэньчжэнь", lat: 22.5431, lon: 114.0579 },
    { name: "Стамбул", lat: 41.0082, lon: 28.9784 },
    { name: "Нью-Йорк", lat: 40.7128, lon: -74.0060 }
];

export async function GET() {
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    
    if (!API_KEY) {
        console.error("Ошибка сервера: Отсутствует OPENWEATHER_API_KEY в .env");
        return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    try {
        const results = await Promise.all(HUBS.map(async (hub) => {
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${hub.lat}&lon=${hub.lon}&units=metric&lang=ru&appid=${API_KEY}`;
            const res = await fetch(url);
            
            if (!res.ok) {
                console.error(`Ошибка от OpenWeather для хаба ${hub.name}: статус ${res.status}`);
                throw new Error('Сбой при запросе к внешнему API');
            }

            const data = await res.json();
            
            return { 
                name: hub.name, 
                temp: Math.round(data.main.temp), 
                desc: data.weather[0].description 
            };
        }));
        
        return NextResponse.json(results);
    } catch (error) {
        console.error("Ошибка при парсинге погоды:", error);
        return NextResponse.json({ error: "Failed to fetch weather" }, { status: 500 });
    }
}