'use client';

import { useEffect, useState } from 'react';

function formatLocal(offsetSeconds: number): string {
  const d = new Date(Date.now() + offsetSeconds * 1000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// Тикающие местные часы хаба (вычисляются из сдвига UTC, без зависимостей).
export function WeatherClock({ offsetSeconds }: { offsetSeconds: number }) {
  const [time, setTime] = useState(() => formatLocal(offsetSeconds));

  useEffect(() => {
    setTime(formatLocal(offsetSeconds));
    const id = setInterval(() => setTime(formatLocal(offsetSeconds)), 1000);
    return () => clearInterval(id);
  }, [offsetSeconds]);

  return <span suppressHydrationWarning>{time}</span>;
}
