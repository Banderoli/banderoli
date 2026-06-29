import type { ComponentType } from 'react';
import {
  AlertTriangle,
  BellRing,
  Boxes,
  Camera,
  ChevronDown,
  Package,
  Repeat,
  Scale,
  Send,
  Sparkles,
  Truck,
  Weight,
} from 'lucide-react';
import { getGelRates } from '@/lib/nbg-rate';

type Icon = ComponentType<{ size?: number; 'aria-hidden'?: boolean; className?: string }>;

// Что получает пользователь — ценность, а не устройство системы.
const BENEFITS: { icon: Icon; title: string; body: string }[] = [
  {
    icon: Scale,
    title: 'Следит за лимитом',
    body: 'Автоматически считаем стоимость всех ваших покупок и предупреждаем до того, как возникнут проблемы с таможней.',
  },
  {
    icon: Package,
    title: 'Собирает посылки',
    body: 'Добавляйте товары вручную или импортируйте корзину магазина. Стоимость доставки автоматически учитывается в лимите.',
  },
  {
    icon: Sparkles,
    title: 'Заполняет данные',
    body: 'Загрузите скриншот корзины — товары, цены и магазин распознаются автоматически. Расширение браузера — скоро.',
  },
  {
    icon: BellRing,
    title: 'Предупреждает заранее',
    body: 'Если есть риск превышения лимита, коммерческой партии или совпадения дат прибытия — вы узнаете об этом заранее.',
  },
];

// Правила в формате «можно или нельзя» — так, как их задаёт реальный пользователь.
const QUESTIONS: { icon: Icon; q: string; a: string }[] = [
  {
    icon: Scale,
    q: 'Что будет при превышении 300 GEL на получателя?',
    a: 'Начисляется НДС 18% и пошлина 0–12% (по коду ТН ВЭД) на всю стоимость партии, а не только на сумму сверх лимита.',
  },
  {
    icon: Weight,
    q: 'Что будет, если посылка тяжелее 30 кг?',
    a: 'Отправление переводится в категорию коммерческих с полным таможенным оформлением.',
  },
  {
    icon: Boxes,
    q: 'Можно ли заказать 5 одинаковых товаров?',
    a: '5+ единиц однотипного товара — маркер коммерческой партии: возможны переквалификация, переоценка и оформление как для бизнеса.',
  },
  {
    icon: Repeat,
    q: 'Что если две посылки придут в один день?',
    a: 'Их стоимость суммируется на получателя. Если в сумме больше 300 GEL — налог начисляется на всю сумму.',
  },
];

const TIPS: { icon: Icon; text: string }[] = [
  { icon: Camera, text: 'Скриншот корзины — самый быстрый способ: ИИ распознает товары, цены, доставку и магазин.' },
  { icon: Truck, text: 'У посылки с трек-номером кнопка «Проверить статус» покажет реальный статус доставки.' },
  { icon: Sparkles, text: 'ИИ-функции (отзывы, подбор товара, распознавание корзины) — бесплатно до 10 запросов в день.' },
  { icon: Send, text: 'Telegram-бот пришлёт уведомление о приближении к лимиту и совпадении прибытия.' },
];

export default async function CapabilitiesPage() {
  const rates = await getGelRates();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-xl font-semibold">Что умеет Banderoli</h1>
        <p className="mt-1 text-sm text-muted">
          Никаких сюрприз-налогов и ручных подсчётов — мы считаем стоимость покупок за вас и
          предупреждаем заранее.
        </p>
      </header>

      {/* ─── Четыре карточки-ценности ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {BENEFITS.map((b) => {
          const BIcon = b.icon;
          return (
            <div key={b.title} className="rounded-xl border border-hairline bg-surface p-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">
                <BIcon size={18} aria-hidden />
              </span>
              <div className="mt-3 text-sm font-medium">{b.title}</div>
              <p className="mt-1 text-sm leading-relaxed text-muted">{b.body}</p>
            </div>
          );
        })}
      </div>

      {/* ─── Подробнее (свёрнуто по умолчанию) ────────────────────── */}
      <details className="group rounded-xl border border-hairline bg-surface shadow-card">
        <summary className="flex cursor-pointer items-center justify-between gap-2 px-5 py-4 text-sm font-medium">
          Подробнее: правила, лимиты и расчёты
          <ChevronDown size={16} aria-hidden className="text-muted transition group-open:rotate-180" />
        </summary>

        <div className="space-y-6 border-t border-hairline px-5 py-5">
          {/* Логика расчёта */}
          <div>
            <h3 className="text-sm font-medium">Как считается стоимость и лимит</h3>
            <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted">
              <p>
                Стоимость посылки = <span className="text-ink">сумма цен всех товаров + стоимость
                доставки</span>. Доставка тоже входит в таможенный лимит. Цены можно вводить в
                USD, EUR, TRY, CNY или GEL — сумма переводится в лари по официальному курсу Нацбанка
                Грузии (nbg.gov.ge) для выбранной валюты.
              </p>
              <p className="text-xs">
                Сейчас:{' '}
                <span className="text-ink">
                  1 USD ≈ {rates.USD.toFixed(4)} · 1 EUR ≈ {rates.EUR.toFixed(4)} · 1 TRY ≈{' '}
                  {rates.TRY.toFixed(4)} · 1 CNY ≈ {rates.CNY.toFixed(4)} GEL
                </span>.
              </p>
              <p>
                Лимит считается по каждому получателю и по дню ожидаемого прибытия. На дашборде
                барометр экспозиции и прогресс-бар лимита 0–300 GEL краснеют по мере приближения, а
                блок «Получатели у лимита» подсказывает, у кого мало запаса.
              </p>
            </div>
          </div>

          {/* Частые вопросы */}
          <div>
            <h3 className="text-sm font-medium">Можно или нельзя — частые вопросы</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {QUESTIONS.map((item) => {
                const QIcon = item.icon;
                return (
                  <div key={item.q} className="rounded-lg border border-hairline bg-canvas p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-dark">
                        <QIcon size={14} aria-hidden />
                      </span>
                      <div className="text-sm font-medium">{item.q}</div>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{item.a}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 flex gap-2 rounded-lg bg-medium-soft p-3 text-xs leading-relaxed text-medium">
              <AlertTriangle size={15} aria-hidden className="mt-0.5 shrink-0" />
              Высокая частота ввоза может трактоваться инспектором как коммерческая деятельность.
              Banderoli информирует о факторах экспозиции и ваших обязанностях — решение и
              ответственность остаются за вами.
            </p>
          </div>

          {/* Подсказки по функциям */}
          <div>
            <h3 className="text-sm font-medium">Подсказки</h3>
            <ul className="mt-2 space-y-2">
              {TIPS.map((tip) => {
                const TIcon = tip.icon;
                return (
                  <li key={tip.text} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                    <TIcon size={15} aria-hidden className="mt-0.5 shrink-0 text-brand-dark" />
                    <span>{tip.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Отказ от ответственности */}
          <div className="rounded-lg border border-hairline bg-high-soft p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} aria-hidden className="shrink-0 text-high" />
              <h3 className="text-sm font-medium text-high">Отказ от ответственности</h3>
            </div>
            <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted">
              <p>
                Banderoli — информационный сервис. Он показывает оценку вашей налоговой экспозиции и
                остаток беспошлинного лимита, но не является юридической или налоговой консультацией
                и не заменяет официальные нормы.
              </p>
              <p>
                Расчёты приблизительные: курс валют, коды ТН ВЭД и решение таможенного инспектора
                могут отличаться. Окончательное решение, декларирование и уплата налогов остаются
                вашей ответственностью. Актуальные правила — на сайте Службы доходов Грузии (rs.ge).
              </p>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
