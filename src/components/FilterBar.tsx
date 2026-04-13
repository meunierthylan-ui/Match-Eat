"use client";

export const PRIX_OPTIONS = ["€", "€€", "€€€", "€€€€"] as const;
export const CUISINE_OPTIONS = [
  "🇫🇷 Français",
  "🍕 Italien",
  "🍣 Japonais",
  "🥩 Steakhouse",
  "🫔 Libanais",
  "🍜 Asiatique",
  "🍛 Indien",
  "🥗 Végétarien",
  "🦞 Fruits de mer",
  "🍔 Burger",
  "🥐 Brunch",
  "🌮 Mexicain",
  "⭐ Gastronomique",
  "🫒 Grec",
] as const;

export const ARRONDISSEMENT_OPTIONS = [
  "1er",
  "2e",
  "3e",
  "4e",
  "5e",
  "6e",
  "7e",
  "8e",
  "9e",
  "10e",
  "11e",
  "12e",
  "13e",
  "14e",
  "15e",
  "16e",
  "17e",
  "18e",
  "19e",
  "20e",
] as const;

export interface FilterState {
  prix: string[];
  cuisine: string[];
  arrondissement: string[];
}

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string | null) => void;
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
        active
          ? "bg-amber-400/90 text-black shadow-[0_0_14px_rgba(251,191,36,0.35)]"
          : "bg-white/10 text-white/85 hover:bg-white/20"
      }`}
    >
      {label}
    </button>
  );
}

export default function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 py-3">
      {/* Prix */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 shrink-0 text-xs font-medium uppercase tracking-wider text-white/50">
          Prix
        </span>
        <div className="flex flex-wrap gap-2">
          {PRIX_OPTIONS.map((p) => (
            <Pill
              key={p}
              label={p}
              active={filters.prix.includes(p)}
              onClick={() => onFilterChange("prix", p)}
            />
          ))}
        </div>
      </div>
      {/* Arrondissement */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 shrink-0 text-xs font-medium uppercase tracking-wider text-white/50">
          Arrondissement
        </span>
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 scrollbar-none">
          {ARRONDISSEMENT_OPTIONS.map((arr) => (
            <Pill
              key={arr}
              label={arr}
              active={filters.arrondissement.includes(arr)}
              onClick={() => onFilterChange("arrondissement", arr)}
            />
          ))}
        </div>
      </div>
      {/* Cuisine */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 shrink-0 text-xs font-medium uppercase tracking-wider text-white/50">
          Cuisine
        </span>
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CUISINE_OPTIONS.map((c) => (
            <Pill
              key={c}
              label={c}
              active={filters.cuisine.includes(c)}
              onClick={() => onFilterChange("cuisine", c)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
