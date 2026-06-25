'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Package,
  PackageOpen,
  Scale,
  Settings,
  Sparkles,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { signOutAction } from '@/app/auth-actions';

interface NavEntry {
  label: string;
  icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
  href?: string;
}

const SECTIONS: Array<{ title?: string; items: NavEntry[] }> = [
  {
    items: [
      { label: 'Дашборд', icon: LayoutDashboard, href: '/dashboard' },
      { label: 'Посылки', icon: PackageOpen, href: '/dashboard/parcels' },
      { label: 'Аналитика', icon: BarChart3, href: '/dashboard/analytics' },
      { label: 'ИИ функции', icon: Sparkles, href: '/dashboard/ai' },
      { label: 'Настройки', icon: Settings, href: '/dashboard/settings' },
    ],
  },
  {
    title: 'Справка',
    items: [{ label: 'Правила ввоза', icon: Scale, href: '/dashboard/rules' }],
  },
];

export function Sidebar({ name }: { name: string }) {
  const pathname = usePathname();
  const initials = name
    .split(/[\s@.]+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-hairline bg-surface py-5">
      <div className="flex items-center gap-2 px-4 pb-5 text-[15px] font-medium">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white">
          <Package size={15} aria-hidden />
        </span>
        Banderoli
      </div>

      {SECTIONS.map((section, i) => (
        <div key={section.title ?? `section-${i}`}>
          {section.title ? (
            <div className="px-4 pb-1 pt-3 text-[11px] uppercase tracking-wider text-muted">
              {section.title}
            </div>
          ) : null}
          {section.items.map((item) => {
            const Icon = item.icon;
            const active = item.href === pathname;
            const className = `flex items-center gap-2.5 px-4 py-2 text-sm ${
              active ? 'bg-canvas font-medium text-ink' : 'text-muted'
            }`;

            if (!item.href) {
              return (
                <div key={item.label} className={`${className} cursor-default opacity-60`}>
                  <Icon size={16} aria-hidden />
                  {item.label}
                </div>
              );
            }

            return (
              <Link key={item.label} href={item.href} className={`${className} transition hover:text-ink`}>
                <Icon size={16} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="mt-auto flex items-center gap-2.5 border-t border-hairline px-4 pt-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-xs font-medium text-brand-dark">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{name}</div>
          <div className="text-[11px] text-muted">Pro · Тбилиси</div>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            aria-label="Выйти"
            title="Выйти"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition hover:bg-canvas hover:text-ink"
          >
            <LogOut size={15} aria-hidden />
          </button>
        </form>
      </div>
    </aside>
  );
}
