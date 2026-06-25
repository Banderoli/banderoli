import { Prisma } from '@banderoli/database';

// Prisma возвращает денежные/весовые поля как Prisma.Decimal — перед отдачей в API
// и передачей в движок экспозиции их нужно привести к number.
export function decimalToNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

export function decimalToNumberOr(value: Prisma.Decimal | null, fallback: number): number {
  return value === null ? fallback : value.toNumber();
}
