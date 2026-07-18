'use client';

import { CopyIcon, ShareIcon } from '@/components/action-icons';

export function ShoppingListExportActions({
  text,
  title,
}: {
  text: string;
  title: string;
}) {
  async function copyList() {
    await navigator.clipboard?.writeText(text);
  }

  async function shareList() {
    if (typeof navigator.share === 'function') {
      await navigator.share({ text, title });
      return;
    }
    await copyList();
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <button
        aria-label="Copy list"
        className="grid size-10 place-items-center rounded-full border border-zinc-200 text-zinc-600 transition hover:border-zinc-950 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
        onClick={copyList}
        title="Copy list"
        type="button"
      >
        <CopyIcon className="size-4" />
      </button>
      <button
        aria-label="Share list"
        className="grid size-10 place-items-center rounded-full border border-zinc-200 text-zinc-600 transition hover:border-zinc-950 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
        onClick={shareList}
        title="Share list"
        type="button"
      >
        <ShareIcon className="size-4" />
      </button>
    </div>
  );
}
