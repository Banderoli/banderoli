import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export interface TelegramAuthData {
  id: number;
  name: string;
  username: string | null;
  photoUrl: string | null;
}

// Поля, которые присылает Telegram Login Widget и которые входят в проверку подписи.
const SIGNED_FIELDS = [
  'auth_date',
  'first_name',
  'id',
  'last_name',
  'photo_url',
  'username',
] as const;

const MAX_AUTH_AGE_SECONDS = 86_400;

/**
 * Проверяет подпись данных Telegram Login Widget по алгоритму из документации:
 * secret = SHA256(botToken), hash = HMAC_SHA256(data_check_string, secret).
 * Возвращает нормализованные данные пользователя или null, если подпись невалидна/устарела.
 */
export function verifyTelegramAuth(raw: unknown, botToken: string): TelegramAuthData | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }

  const data = raw as Record<string, unknown>;
  const hash = typeof data['hash'] === 'string' ? data['hash'] : null;
  const authDate = Number(data['auth_date']);
  const id = Number(data['id']);

  if (!hash || !Number.isFinite(authDate) || !Number.isFinite(id)) {
    return null;
  }

  if (Date.now() / 1000 - authDate > MAX_AUTH_AGE_SECONDS) {
    return null;
  }

  const dataCheckString = SIGNED_FIELDS.filter(
    (key) => data[key] !== undefined && data[key] !== null,
  )
    .map((key) => `${key}=${String(data[key])}`)
    .join('\n');

  const secretKey = createHash('sha256').update(botToken).digest();
  const expected = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(hash, 'hex');
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return null;
  }

  const first = typeof data['first_name'] === 'string' ? data['first_name'] : '';
  const last = typeof data['last_name'] === 'string' ? data['last_name'] : '';
  const username = typeof data['username'] === 'string' ? data['username'] : null;
  const name = `${first} ${last}`.trim() || username || `tg${id}`;

  return {
    id,
    name,
    username,
    photoUrl: typeof data['photo_url'] === 'string' ? data['photo_url'] : null,
  };
}
