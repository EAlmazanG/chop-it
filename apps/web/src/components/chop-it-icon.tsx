import Image from 'next/image';

const chopItIcons = {
  home: '/chop-it/chopit_icon.png',
  recipes: '/chop-it/recetas_icon.png',
  ingredients: '/chop-it/ingredientes_icon.png',
  plans: '/chop-it/planes_icon.png',
  shoppingList: '/chop-it/lista_icon.png',
} as const;

export type ChopItIconName = keyof typeof chopItIcons;

type ChopItIconProps = {
  className?: string;
  icon: ChopItIconName;
  priority?: boolean;
};

export function ChopItIcon({
  className = '',
  icon,
  priority = false,
}: ChopItIconProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={className}
      height={128}
      priority={priority}
      sizes="(max-width: 640px) 48px, 80px"
      src={chopItIcons[icon]}
      width={128}
    />
  );
}
