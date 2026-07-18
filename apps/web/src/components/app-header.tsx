import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function AppHeader({
  actions,
  section,
  sectionHref,
}: {
  actions?: ReactNode;
  section?: string;
  sectionHref?: string;
}) {
  return (
    <header className="flex h-[4.5rem] items-center justify-between border-b border-zinc-100 bg-white px-6 sm:px-8">
      <Link
        className="flex items-center gap-2.5 font-serif text-lg font-semibold tracking-tight text-zinc-950"
        href="/"
      >
        <Image
          alt=""
          className="rounded-lg"
          height={28}
          src="/chop-it/chopit_icon.png"
          width={28}
        />
        <span>Chop It!</span>
      </Link>
      {actions ? (
        actions
      ) : section ? (
        sectionHref ? (
          <Link
            aria-label={`Back to ${section}`}
            className="grid size-8 place-items-center rounded-full text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            href={sectionHref}
            title={`Back to ${section}`}
          >
            <span
              aria-hidden="true"
              className="grid size-6 place-items-center rounded-full border border-zinc-200 text-xs leading-none"
            >
              ←
            </span>
          </Link>
        ) : (
          <span className="text-sm text-zinc-500">{section}</span>
        )
      ) : null}
    </header>
  );
}
