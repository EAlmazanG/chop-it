import Link from 'next/link';

import { AppHeader } from '@/components/app-header';
import { ChopItIcon, type ChopItIconName } from '@/components/chop-it-icon';

const menuItems: Array<{
  description: string;
  href: string;
  icon: ChopItIconName;
  label: string;
  eyebrow: string;
}> = [
  {
    href: '/chop-it/recipes',
    icon: 'recipes',
    label: 'Recetas',
    eyebrow: '01 · Cocina',
    description: 'Crea platos y calcula sus macros por ración.',
  },
  {
    href: '/chop-it/ingredients',
    icon: 'ingredients',
    label: 'Ingredientes',
    eyebrow: '02 · Despensa',
    description: 'Mantén un catálogo nutricional ordenado.',
  },
  {
    href: '/chop-it/plans',
    icon: 'plans',
    label: 'Plan semanal',
    eyebrow: '03 · Ritmo',
    description: 'Distribuye comidas y revisa los totales.',
  },
  {
    href: '/chop-it/shopping-lists',
    icon: 'shoppingList',
    label: 'Lista de compra',
    eyebrow: '04 · Mercado',
    description: 'Convierte el plan en una lista accionable.',
  },
];

export default function ChopItPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f0e7] text-[#1f2b24]">
      <AppHeader />
      <section className="relative mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
        <div className="pointer-events-none absolute -right-36 top-2 size-96 rounded-full bg-[#dbe7c9]/60 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 top-80 size-80 rounded-full bg-[#efc48d]/35 blur-3xl" />

        <div className="relative grid items-end gap-8 border-b border-[#253128]/15 pb-10 lg:grid-cols-[1fr_auto]">
          <div className="max-w-3xl">
            <p className="mb-5 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#68746c]">
              Cocina con intención · compra solo lo necesario
            </p>
            <h1 className="font-serif text-6xl leading-[0.88] tracking-[-0.045em] text-[#172019] sm:text-8xl lg:text-9xl">
              Chop <span className="italic text-[#b54f32]">It!</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[#59645d] sm:text-lg">
              Recetas, planificación nutricional y lista de compra en un flujo
              sencillo. Esta demo incluye datos ficticios para que puedas
              empezar a explorarla al instante.
            </p>
          </div>
          <ChopItIcon
            className="hidden size-36 rotate-3 rounded-[2rem] object-cover shadow-[0_24px_70px_-26px_rgba(31,43,36,0.5)] lg:block"
            icon="home"
            priority
          />
        </div>

        <nav
          aria-label="Secciones de Chop It"
          className="relative mt-8 grid gap-3 md:grid-cols-2"
        >
          {menuItems.map((item) => (
            <Link
              className="group grid min-h-48 grid-cols-[1fr_auto] gap-5 rounded-[1.6rem] border border-[#253128]/10 bg-[#fffdf7]/80 p-6 shadow-[0_14px_40px_-32px_rgba(31,43,36,0.6)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-[#b54f32]/35 hover:bg-[#fffdf7] hover:shadow-[0_24px_50px_-30px_rgba(31,43,36,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b54f32] sm:p-8"
              href={item.href}
              key={item.href}
            >
              <span className="flex flex-col justify-between">
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[#7b857e]">
                  {item.eyebrow}
                </span>
                <span>
                  <span className="block font-serif text-3xl tracking-tight text-[#1f2b24] sm:text-4xl">
                    {item.label}
                  </span>
                  <span className="mt-2 block max-w-xs text-sm leading-6 text-[#68726b]">
                    {item.description}
                  </span>
                </span>
              </span>
              <span className="flex flex-col items-end justify-between">
                <ChopItIcon
                  className="size-20 rounded-2xl object-cover transition duration-300 group-hover:rotate-2 group-hover:scale-105 sm:size-24"
                  icon={item.icon}
                />
                <span className="text-xl text-[#b54f32] transition group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
