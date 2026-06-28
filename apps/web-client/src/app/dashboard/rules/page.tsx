import { AlertTriangle, Boxes, Repeat, Scale, Weight } from 'lucide-react';
import type { ComponentType } from 'react';

interface RuleCard {
  icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
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

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-lg font-medium">Правила ввоза для личного пользования</h1>
      <p className="mt-1 text-sm text-muted">
        Нормы Службы доходов Грузии (rs.ge) для международных почтовых отправлений. Banderoli
        показывает вашу реальную налоговую экспозицию, чтобы не было сюрприз-налогов.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {RULES.map((rule) => {
          const Icon = rule.icon;
          return (
            <div key={rule.title} className="rounded-xl border border-hairline bg-surface shadow-card p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">
                  <Icon size={16} aria-hidden />
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

      <div className="mt-4 flex gap-2 rounded-xl border border-hairline bg-medium-soft p-4 text-sm leading-relaxed text-medium">
        <AlertTriangle size={18} aria-hidden className="mt-0.5 shrink-0" />
        <p>
          Высокая частота ввоза может трактоваться инспектором как коммерческая деятельность.
          Banderoli информирует о факторах экспозиции и ваших обязанностях — окончательное решение
          и ответственность остаются за вами.
        </p>
      </div>

      <p className="mt-4 text-xs text-muted">
        Материал носит информационный характер и не является юридической консультацией. Актуальные
        нормы — на официальном сайте Службы доходов Грузии (rs.ge).
      </p>
    </div>
  );
}
