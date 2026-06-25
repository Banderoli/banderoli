import { describe, expect, it } from 'vitest';
import { createHash, createHmac } from 'node:crypto';
import { verifyTelegramAuth } from './telegram';

const TOKEN = '123456:TEST-BOT-TOKEN';

function sign(payload: Record<string, unknown>): string {
  const dataCheckString = ['auth_date', 'first_name', 'id', 'last_name', 'photo_url', 'username']
    .filter((k) => payload[k] !== undefined && payload[k] !== null)
    .map((k) => `${k}=${String(payload[k])}`)
    .join('\n');
  const secret = createHash('sha256').update(TOKEN).digest();
  return createHmac('sha256', secret).update(dataCheckString).digest('hex');
}

const now = Math.floor(Date.now() / 1000);

describe('verifyTelegramAuth', () => {
  it('принимает валидную подпись', () => {
    const base = { id: 1, first_name: 'A', auth_date: now };
    const result = verifyTelegramAuth({ ...base, hash: sign(base) }, TOKEN);
    expect(result?.id).toBe(1);
  });

  it('отклоняет изменённые данные', () => {
    const base = { id: 1, first_name: 'A', auth_date: now };
    const result = verifyTelegramAuth({ ...base, first_name: 'B', hash: sign(base) }, TOKEN);
    expect(result).toBeNull();
  });

  it('отклоняет чужой токен бота', () => {
    const base = { id: 1, first_name: 'A', auth_date: now };
    expect(verifyTelegramAuth({ ...base, hash: sign(base) }, 'other')).toBeNull();
  });

  it('отклоняет устаревший auth_date', () => {
    const base = { id: 1, first_name: 'A', auth_date: now - 999_999 };
    expect(verifyTelegramAuth({ ...base, hash: sign(base) }, TOKEN)).toBeNull();
  });

  it('отклоняет отсутствие hash', () => {
    expect(verifyTelegramAuth({ id: 1, auth_date: now }, TOKEN)).toBeNull();
  });
});
