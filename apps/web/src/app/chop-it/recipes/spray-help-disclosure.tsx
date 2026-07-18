export function SprayHelpDisclosure({
  gramsPerSpray,
}: {
  gramsPerSpray: number;
}) {
  return (
    <details className="group relative inline-block align-middle">
      <summary
        aria-label="View spray conversion"
        className="grid size-5 cursor-pointer list-none place-items-center rounded-full border border-zinc-200 bg-white text-[11px] font-bold leading-none text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
        title="View spray conversion"
      >
        i
      </summary>
      <span className="absolute right-0 top-7 z-10 w-max max-w-48 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold normal-case leading-4 tracking-normal text-zinc-700 shadow-lg">
        1 spray = {formatSprayGrams(gramsPerSpray)} g
      </span>
    </details>
  );
}

function formatSprayGrams(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}
