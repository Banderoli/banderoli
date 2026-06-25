'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageOpen,
  Scale,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { signOutAction } from '@/app/auth-actions';
import { Logo } from './Logo';

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

function Brand() {
  return <Logo className="text-[17px]" />;
}

function NavContent({
  name,
  initials,
  pathname,
  onNavigate,
}: {
  name: string;
  initials: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="px-4 pb-5">
        <Brand />
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
            const className = `flex items-center gap-2.5 px-4 py-2.5 text-sm ${
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
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavigate}
                className={`${className} transition hover:text-ink`}
              >
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
    </>
  );
}

export function Sidebar({ name }: { name: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const initials = name
    .split(/[\s@.]+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      {/* Мобильная верхняя панель */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-hairline bg-surface px-4 py-3 lg:hidden">
        <Brand />
        <button
          type="button"
          aria-label="Меню"
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:bg-canvas hover:text-ink"
        >
          <Menu size={20} aria-hidden />
        </button>
      </div>

      {/* Десктопный сайдбар */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-hairline bg-surface py-5 lg:flex">
        <NavContent name={name} initials={initials} pathname={pathname} />
      </aside>

      {/* Мобильное выезжающее меню */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col border-r border-hairline bg-surface py-5">
            <button
              type="button"
              aria-label="Закрыть меню"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-canvas hover:text-ink"
            >
              <X size={18} aria-hidden />
            </button>
            <NavContent
              name={name}
              initials={initials}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}
