import { describe, expect, it } from 'vitest';
import { calculateExposure } from './engine';
import type { ParcelExposureInput } from './types';

const day = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

function parcel(overrides: Partial<ParcelExposureInput>): ParcelExposureInput {
  return { valueGel: 0, weightKg: 0, quantity: 1, estimatedArrival: null, ...overrides };
}

const codes = (result: ReturnType<typeof calculateExposure>): string[] =>
  result.alerts.map((a) => a.code);

describe('calculateExposure (дерево решений)', () => {
  it('пустой список → LOW, score 0', () => {
    const r = calculateExposure('r', []);
    expect(r.score).toBe(0);
    expect(r.level).toBe('LOW');
    expect(r.remainingGel).toBe(300);
  });

  it('одна посылка под лимитом → LOW', () => {
    const r = calculateExposure('r', [parcel({ valueGel: 100, estimatedArrival: day('2026-06-23') })]);
    expect(r.level).toBe('LOW');
  });

  it('день > 300 GEL → score 100 HIGH, LIMIT_EXCEEDED', () => {
    const r = calculateExposure('r', [parcel({ valueGel: 350, estimatedArrival: day('2026-06-23') })]);
    expect(r.score).toBe(100);
    expect(r.level).toBe('HIGH');
    expect(codes(r)).toContain('LIMIT_EXCEEDED');
  });

  it('совместное прибытие под лимитом → score 50 MEDIUM, JOINT_ARRIVAL', () => {
    const r = calculateExposure('r', [
      parcel({ valueGel: 120, estimatedArrival: day('2026-06-23') }),
      parcel({ valueGel: 90, estimatedArrival: day('2026-06-23') }),
    ]);
    expect(r.score).toBe(50);
    expect(r.level).toBe('MEDIUM');
    expect(codes(r)).toContain('JOINT_ARRIVAL');
  });

  it('приближение к лимиту (≥240) одиночной → score 40 MEDIUM, APPROACHING_LIMIT', () => {
    const r = calculateExposure('r', [parcel({ valueGel: 250, estimatedArrival: day('2026-06-23') })]);
    expect(r.score).toBe(40);
    expect(codes(r)).toContain('APPROACHING_LIMIT');
  });

  it('5+ однотипных → HOMOGENEOUS_GOODS, не ниже MEDIUM', () => {
    const r = calculateExposure('r', [
      parcel({ valueGel: 80, quantity: 6, estimatedArrival: day('2026-06-23') }),
    ]);
    expect(codes(r)).toContain('HOMOGENEOUS_GOODS');
    expect(r.score).toBeGreaterThanOrEqual(31);
  });

  it('вес > 30 кг → WEIGHT_EXCEEDED', () => {
    const r = calculateExposure('r', [
      parcel({ valueGel: 50, weightKg: 35, estimatedArrival: day('2026-06-23') }),
    ]);
    expect(codes(r)).toContain('WEIGHT_EXCEEDED');
  });

  it('разные дни без совместного прибытия → LOW', () => {
    const r = calculateExposure('r', [
      parcel({ valueGel: 120, estimatedArrival: day('2026-06-23') }),
      parcel({ valueGel: 90, estimatedArrival: day('2026-06-25') }),
    ]);
    expect(r.level).toBe('LOW');
  });

  it('remainingGel не уходит в минус', () => {
    const r = calculateExposure('r', [parcel({ valueGel: 500, estimatedArrival: day('2026-06-23') })]);
    expect(r.remainingGel).toBe(0);
  });

  it('алерты не содержат советов по обходу (комплаенс)', () => {
    const r = calculateExposure('r', [parcel({ valueGel: 350, estimatedArrival: day('2026-06-23') })]);
    const text = r.alerts.map((a) => a.message).join(' ').toLowerCase();
    expect(text).not.toContain('распредел');
    expect(text).not.toContain('задерж');
    expect(text).not.toContain('скрыть');
  });
});
