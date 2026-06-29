import type { ComponentType, ReactNode } from 'react';
import {
  AlertTriangle,
  Boxes,
  Calculator,
  Camera,
  Package,
  Repeat,
  Scale,
  Send,
  Sparkles,
  Store,
  Truck,
  Users,
  Weight,
} from 'lucide-react';
import { getUsdToGelRate } from '@/lib/nbg-rate';

type Icon = ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;

interface RuleCard {
  icon: Icon;
  title: string;
  limit: string;
  consequence: string;
}

const RULES: RuleCard[] = [
  {
    icon: Scale,
    title: 'Беспошлинный лимит стоимости',
    limit: '≤ 300 GEL на получателя',
    consequence:
      'При превышении начисляется НДС 18% и таможенная пошлина 0–12% (по коду ТН ВЭД) на всю стоимость партии, а не только на сумму сверх лимита.',
  },
  {
    icon: Weight,
    title: 'Лимит веса',
    limit: '≤ 30 кг',
    consequence:
      'Превышение переводит отправление в категорию коммерческих с полным таможенным оформлением.',
  },
  {
    icon: Boxes,
    title: 'Однородность товаров',
    limit: 'до 5 единиц одного типа',
    consequence:
      '5+ единиц однотипного товара — маркер коммерческой партии: возможна переквалификация, переоценка и оформление как для бизнеса.',
  },
  {
    icon: Repeat,
    title: 'Консолидация по дню прибытия',
    limit: 'суммируется на получателя',
    consequence:
      'Несколько посылок одному получателю в один операционный день суммируются. Если совокупная стоимость превышает 300 GEL — налог начисляется на всю сумму.',
  },
];

function GuideItem({ icon: Icon, title, children }: { icon: Icon; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">
        <Icon size={17} aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-1 space-y-2 text-sm leading-relaxed text-muted">{children}</div>
      </div>
    </div>
  );
}

export default async function HowItWorksPage() {
  const usdToGelRate = await getUsdToGelRate();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-lg font-medium">Как это работает</h1>
        <p className="mt-1 text-sm text-muted">
          Banderoli показывает реальную картину: где посылки, какова таможенная экспозиция и когда
          наступит порог — чтобы не было сюрприз-налогов и случайных нарушений лимита.
        </p>
      </header>

      {/* ─── Инструкция пользователя ─────────────────────────────── */}
      <section className="rounded-xl border border-hairline bg-surface p-5 shadow-card">
        <h2 className="text-base font-medium">Инструкция пользователя</h2>
        <p className="mt-0.5 text-sm text-muted">Короткий разбор основных функций.</p>

        <div className="mt-5 space-y-5">
          <GuideItem icon={Package} title="Добавление посылки">
            <p>
              Нажмите <span className="text-ink">«Добавить трек»</span> на дашборде. Укажите название
              посылки (любая метка, удобно по получателю — «Алия1»), получателя (на кого оформляется),
              даты покупки и ожидаемой доставки, магазин и перевозчика.
            </p>
            <p>
              В разделе <span className="text-ink">«Товары в посылке»</span> добавляйте позиции
              кнопкой «+ продукция» — название и цену каждого товара. Ниже укажите стоимость доставки,
              вес и комментарий. Трек-номер необязателен: посылку можно завести заранее и добавить
              трек позже.
            </p>
          </GuideItem>

          <GuideItem icon={Camera} title="Заполнение из скриншота">
            <p>
              В форме есть кнопка <span className="text-ink">«Заполнить из скриншота»</span>. Сделайте
              скриншот корзины магазина (клавишами Ctrl + / Ctrl −, чтобы вся корзина поместилась на
              экране) и перетащите его в окно — ИИ распознает магазин, товары, цены и доставку и
              заполнит форму.
            </p>
            <p>Перед сохранением обязательно сверьте распознанные данные с корзиной.</p>
          </GuideItem>

          <GuideItem icon={Users} title="Получатели — зачем и как">
            <p>
              Беспошлинный лимит 300 GEL действует на <span className="text-ink">каждого
              получателя отдельно</span>. Получатели — это реальные физлица (вы и ваши близкие), на
              которых приходят их собственные покупки.
            </p>
            <p>
              Добавляйте и редактируйте получателей в <span className="text-ink">Настройках</span>.
              При добавлении посылки честно выбирайте, на кого она оформлена, — так Banderoli
              правильно считает лимит каждого.
            </p>
          </GuideItem>

          <GuideItem icon={Store} title="Магазины и перевозчики">
            <p>
              Списки магазинов и перевозчиков ведутся в <span className="text-ink">Настройках</span>.
              Они появляются подсказками в форме посылки — чтобы не вводить названия вручную и держать
              аналитику аккуратной.
            </p>
          </GuideItem>

          <GuideItem icon={Calculator} title="Как считается стоимость и лимит">
            <p>
              Стоимость посылки = <span className="text-ink">сумма цен всех товаров + стоимость
              доставки</span>. Доставка тоже входит в таможенный лимит. Сумма переводится в лари по
              официальному курсу Нацбанка Грузии (nbg.gov.ge): сейчас{' '}
              <span className="text-ink">1 USD ≈ {usdToGelRate.toFixed(4)} GEL</span>.
            </p>
            <p>
              Лимит считается по каждому получателю и по дню ожидаемого прибытия: посылки одному
              получателю в один операционный день суммируются. Если в сумме больше 300 GEL — вероятен
              НДС 18% и пошлина на всю стоимость, а не только на превышение.
            </p>
            <p>
              На дашборде это видно: барометр экспозиции и прогресс-бар лимита 0–300 GEL краснеют по
              мере приближения, а блок «Получатели у лимита» подсказывает, у кого мало запаса.
            </p>
          </GuideItem>

          <GuideItem icon={Truck} title="Трекинг посылок">
            <p>
              Если у посылки указан трек-номер, кнопка <span className="text-ink">«Проверить
              статус»</span> на карточке покажет реальный статус доставки (через Ship24, 1000+
              перевозчиков).
            </p>
          </GuideItem>

          <GuideItem icon={Sparkles} title="ИИ функции">
            <p>
              На странице <span className="text-ink">«ИИ функции»</span> — поиск и сводка отзывов о
              товаре по ссылке и подбор товара по описанию. Плюс распознавание скриншота корзины прямо
              в форме посылки.
            </p>
            <p>Все ИИ-функции бесплатны до 10 запросов в день (общий дневной счётчик).</p>
          </GuideItem>

          <GuideItem icon={Send} title="Telegram-уведомления">
            <p>
              В <span className="text-ink">Настройках</span> можно открыть Telegram-бота и указать
              Telegram в профиле получателя. Бот присылает уведомления о таможенной экспозиции —
              приближении к лимиту и совместном прибытии посылок.
            </p>
          </GuideItem>
        </div>
      </section>

      {/* ─── Правила ввоза ───────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-medium">Правила ввоза</h2>
        <p className="mt-0.5 text-sm text-muted">
          Нормы Службы доходов Грузии (rs.ge) для международных почтовых отправлений личного
          пользования.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {RULES.map((rule) => {
            const RuleIcon = rule.icon;
            return (
              <div key={rule.title} className="rounded-xl border border-hairline bg-surface p-4 shadow-card">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">
                    <RuleIcon size={16} aria-hidden />
                  </span>
                  <div>
                    <div className="text-sm font-medium">{rule.title}</div>
                    <div className="text-xs text-brand-dark">{rule.limit}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{rule.consequence}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex gap-2 rounded-xl border border-hairline bg-medium-soft p-4 text-sm leading-relaxed text-medium shadow-card">
          <AlertTriangle size={18} aria-hidden className="mt-0.5 shrink-0" />
          <p>
            Высокая частота ввоза может трактоваться инспектором как коммерческая деятельность.
            Banderoli информирует о факторах экспозиции и ваших обязанностях — окончательное решение
            и ответственность остаются за вами.
          </p>
        </div>
      </section>

      {/* ─── Отказ от ответственности ────────────────────────────── */}
      <section className="rounded-xl border border-hairline bg-high-soft p-5 shadow-card">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} aria-hidden className="shrink-0 text-high" />
          <h2 className="text-base font-medium text-high">Отказ от ответственности</h2>
        </div>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted">
          <p>
            Banderoli — информационный сервис. Он показывает оценку вашей налоговой экспозиции и
            остаток беспошлинного лимита, но не является юридической или налоговой консультацией и не
            заменяет официальные нормы.
          </p>
          <p>
            Расчёты приблизительные: курс валют, коды ТН ВЭД и решение таможенного инспектора могут
            отличаться от оценки. Окончательное решение, декларирование и уплата налогов остаются вашей
            ответственностью.
          </p>
          <p>
            Актуальные правила — на официальном сайте Службы доходов Грузии (rs.ge).
          </p>
        </div>
      </section>
    </div>
  );
}
