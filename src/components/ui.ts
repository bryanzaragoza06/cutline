// Shared Tailwind class strings so the baby blue visual language stays consistent.
// (`black` is themed to deep navy in globals.css.)
export const card = "rounded-xl border border-black/10 bg-surface dark:border-white/10";
export const primaryButton =
  "rounded-lg bg-baby px-4 py-2 text-sm font-medium text-black hover:bg-baby-strong disabled:cursor-not-allowed disabled:opacity-40";
export const secondaryButton =
  "rounded-lg border border-black/15 bg-surface px-4 py-2 text-sm font-medium hover:bg-baby-soft disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15";
export const input =
  "w-full rounded-lg border border-black/15 bg-surface px-3 py-2 text-sm outline-none focus:border-baby-strong focus:ring-2 focus:ring-baby/40 dark:border-white/15";
export const label = "mb-1 block text-xs font-medium text-black/60 dark:text-white/60";

export function pill(selected: boolean): string {
  return `rounded-full border px-3 py-1 text-xs transition-colors ${
    selected
      ? "border-baby-strong bg-baby text-black"
      : "border-black/15 bg-surface hover:border-baby-strong dark:border-white/15"
  }`;
}
