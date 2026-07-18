export function IngredientFilters({
  actingUserId,
  query,
}: {
  actingUserId?: string;
  query: string;
}) {
  return (
    <form className="grid gap-3 rounded-lg border border-zinc-200 p-4 sm:grid-cols-[1fr_auto]">
      {actingUserId ? (
        <input name="actingUserId" type="hidden" value={actingUserId} />
      ) : null}
      <Field label="Search">
        <input
          className={inputClassName}
          defaultValue={query}
          name="q"
          placeholder="Chicken, grains..."
        />
      </Field>
      <button className={primaryButtonClassName}>Filter</button>
    </form>
  );
}

const inputClassName =
  'h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10';
const primaryButtonClassName =
  'h-11 self-end rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2';

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
      <span>{label}</span>
      {children}
    </label>
  );
}
