import type { ReactNode } from 'react';

import { ChopItIcon, type ChopItIconName } from '@/components/chop-it-icon';

type ChopItSectionHeaderProps = {
  aside?: ReactNode;
  description: string;
  icon: ChopItIconName;
  title: string;
};

export function ChopItSectionHeader({
  aside,
  description,
  icon,
  title,
}: ChopItSectionHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-[#253128]/10 pb-7">
      <div className="flex items-center gap-4 sm:gap-5">
        <ChopItIcon
          className="size-20 shrink-0 rounded-2xl object-cover sm:size-24 sm:rounded-[1.5rem]"
          icon={icon}
          priority
        />
        <div>
          <h1 className="font-serif text-4xl leading-none tracking-[-0.035em] text-[#172019] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68726b]">
            {description}
          </p>
        </div>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}
