import { describe, expect, it } from 'vitest';
import { redisConnectionFromUrl } from './redis';

describe('redisConnectionFromUrl', () => {
  it('парсит host и port', () => {
    const o = redisConnectionFromUrl('redis://localhost:6379');
    expect(o.host).toBe('localhost');
    expect(o.port).toBe(6379);
    expect(o.maxRetriesPerRequest).toBeNull();
  });

  it('парсит логин, пароль и номер БД', () => {
    const o = redisConnectionFromUrl('redis://user:pass@10.0.0.1:6380/2');
    expect(o.host).toBe('10.0.0.1');
    expect(o.port).toBe(6380);
    expect(o.username).toBe('user');
    expect(o.password).toBe('pass');
    expect(o.db).toBe(2);
  });

  it('подставляет порт 6379 по умолчанию', () => {
    const o = redisConnectionFromUrl('redis://cache.internal');
    expect(o.port).toBe(6379);
    expect(o.username).toBeUndefined();
  });
});
