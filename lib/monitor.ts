import axios from 'axios';
import * as cheerio from 'cheerio';
import { prisma } from '@/lib/prisma';

// Функция автоматического парсинга сайтов перевозчиков на задержки
export async function checkCarrierDelays(carrierName: string, url: string) {
  try {
    // Явно указываем axios, что мы ожидаем получить текстовую HTML строку
    const { data } = await axios.get<string>(url, { timeout: 10000 });
    
    const $ = cheerio.load(data);
    const content = $('body').text().toLowerCase();
    
    // Ключевые слова-триггеры для обнаружения логистических сбоев
    const keywords = ['задержка', 'рейс', 'склад', 'задержан', 'шторм', 'отмена', 'задерживается', 'опоздание'];
    const found = keywords.filter(word => content.includes(word));

    if (found.length > 0) {
      await prisma.alert.create({
        data: {
          type: 'WAREHOUSE_DELAY',
          message: `Служба ${carrierName}: На официальном сайте обнаружены риски задержек (найдены упоминания: ${found.join(', ')}).`,
          severity: 'WARNING',
          relatedHub: carrierName
        }
      });
    }
  } catch (err) {
    console.error(`[Парсер] Не удалось просканировать сайт службы ${carrierName}:`, err);
  }
}