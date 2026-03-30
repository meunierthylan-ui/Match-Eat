import type { RestaurantRow } from "@/types/database.types";

interface MatchOverlayProps {
  groupMatch?: RestaurantRow | null;
}

export default function MatchOverlay({ groupMatch }: MatchOverlayProps) {
  if (!groupMatch) return null;
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center"
      aria-live="polite"
    >
      <div className="rounded-2xl border-2 border-amber-400/80 bg-black/90 px-8 py-6 shadow-[0_0_40px_rgba(251,191,36,0.3)]">
        <p className="text-center text-2xl font-bold uppercase tracking-wider text-amber-300">
          Match de Groupe !
        </p>
        <p className="mt-2 text-center text-lg text-white/95">{groupMatch.name}</p>
      </div>
    </div>
  );
}
