"use client";

import { GLASS_SHEET, TOUCH_BUTTON } from "@/lib/ui";

type BrowseScreenProps = {
  title: string;
  subtitle?: string;
  items: string[];
  emptyMessage?: string;
  onSelect: (item: string) => void;
  onBack: () => void;
};

export function BrowseScreen({
  title,
  subtitle,
  items,
  emptyMessage = "No places available yet.",
  onSelect,
  onBack,
}: BrowseScreenProps) {
  return (
    <div className="relative flex h-dvh flex-col bg-gradient-to-b from-sky-950 via-slate-900 to-zinc-950">
      <div className="flex-1" />

      <div
        className={`${GLASS_SHEET} max-h-[78vh] overflow-y-auto px-4 pt-4 pb-8 md:fixed md:right-4 md:bottom-4 md:left-auto md:w-[26rem] md:max-h-[calc(100vh-2rem)] md:px-5 md:pt-5`}
      >
        <button
          type="button"
          onClick={onBack}
          className="mb-3 text-sm font-medium text-zinc-700 hover:text-zinc-900"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-zinc-700">{subtitle}</p>
        )}

        <ul className="mt-4 space-y-2">
          {items.length === 0 && (
            <li className="rounded-xl bg-white/40 px-4 py-3 text-sm text-zinc-700">
              {emptyMessage}
            </li>
          )}
          {items.map((item) => (
            <li key={item}>
              <button
                type="button"
                className={`${TOUCH_BUTTON} w-full bg-white/50 text-zinc-900 hover:bg-white/70`}
                onClick={() => onSelect(item)}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
