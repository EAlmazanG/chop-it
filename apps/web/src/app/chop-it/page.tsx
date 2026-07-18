import Link from 'next/link';

import { AppHeader } from '@/components/app-header';
import { ChopItIcon, type ChopItIconName } from '@/components/chop-it-icon';

const menuItems: Array<{
  description: string;
  href: string;
  icon: ChopItIconName;
  label: string;
}> = [
  {
    href: '/chop-it/recipes',
    icon: 'recipes',
    label: 'Recipes',
    description: 'Create dishes and calculate macros per serving.',
  },
  {
    href: '/chop-it/ingredients',
    icon: 'ingredients',
    label: 'Ingredients',
    description: 'Keep an organized nutritional catalog.',
  },
  {
    href: '/chop-it/plans',
    icon: 'plans',
    label: 'Weekly plan',
    description: 'Schedule meals and review nutrition totals.',
  },
  {
    href: '/chop-it/shopping-lists',
    icon: 'shoppingList',
    label: 'Shopping list',
    description: 'Turn your plan into an actionable list.',
  },
];

export default function ChopItPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#1f2b24]">
      <AppHeader />
      <section className="relative mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
        <div className="relative flex justify-center">
          <div className="flex items-center justify-center gap-4 sm:gap-7">
            <ChopItIcon
              className="size-20 shrink-0 rounded-2xl object-cover sm:size-28 lg:size-32 lg:rounded-[1.75rem]"
              icon="home"
              priority
            />
            <h1 className="font-serif text-6xl leading-[0.88] tracking-[-0.045em] text-[#172019] sm:text-8xl lg:text-9xl">
              Chop <span className="italic text-[#b54f32]">It!</span>
            </h1>
          </div>
        </div>

        <nav
          aria-label="Chop It sections"
          className="relative mt-8 grid gap-3 md:grid-cols-2"
        >
          {menuItems.map((item) => (
            <Link
              className="group grid min-h-48 grid-cols-[1fr_auto] gap-5 rounded-[1.6rem] border border-[#253128]/10 bg-[#fffdf7]/80 p-6 shadow-[0_14px_40px_-32px_rgba(31,43,36,0.6)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-[#b54f32]/35 hover:bg-[#fffdf7] hover:shadow-[0_24px_50px_-30px_rgba(31,43,36,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b54f32] sm:p-8"
              href={item.href}
              key={item.href}
            >
              <span className="flex flex-col justify-center">
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
