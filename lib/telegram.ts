export async function sendTelegramToUser(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!chatId) {
    console.error('🚨 ОШИБКА: chatId отсутствует! Невозможно отправить сообщение.');
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    console.error('🚨 ОШИБКА ОТ TELEGRAM:', JSON.stringify(data));
  } else {
    console.log('✅ УСПЕХ: Сообщение доставлено в Telegram!');
  }

  return data;
}