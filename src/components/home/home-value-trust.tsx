import { Battery, ShieldCheck, Truck, Zap } from "lucide-react";

const items = [
  {
    icon: Battery,
    title: "До 48 годин автономії",
    text: "Стабільне живлення для критичних сценаріїв",
  },
  {
    icon: Zap,
    title: "Швидка зарядка",
    text: "Сучасні протоколи для мінімального часу очікування",
  },
  {
    icon: ShieldCheck,
    title: "Гарантія якості",
    text: "Перевірені рішення та підтримка бренду",
  },
  {
    icon: Truck,
    title: "Доставка по Україні",
    text: "Надійна логістика до вашого міста",
  },
] as const;

export function HomeValueTrust() {
  return (
    <section
      className="border-b border-white/[0.06] px-5 py-20 sm:px-8 lg:px-12 lg:py-24"
      aria-labelledby="home-trust-heading"
    >
      <div className="mx-auto max-w-[90rem]">
        <h2
          id="home-trust-heading"
          className="sr-only"
        >
          Переваги та довіра
        </h2>
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {items.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-cyan-400/20 hover:bg-white/[0.04]"
            >
              <div className="mb-4 inline-flex rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-300">
                <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden />
              </div>
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {text}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
