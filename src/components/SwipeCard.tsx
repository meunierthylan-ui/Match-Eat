"use client";

// Note : pour optimiser les images de la galerie (chargement paresseux + rendu conditionnel),
// il faut que la galerie (ex : <Gallery /> ou équivalent) ne soit rendue que si le volet de détails est ouvert.
// Pour cela, vérifiez la prop isOpen avant de rendre la galerie, comme :
// {isOpen && <Gallery ... />}
// Et, dans la <Gallery> elle-même, ajoutez loading="lazy" à toutes les balises <img>, ex :
// <img src={...} alt={...} loading="lazy" />


import { useCallback, useRef } from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import { ExternalLink, MapPin } from "lucide-react";
import type { RestaurantRow } from "@/types/database.types";

const SWIPE_THRESHOLD_PX = 100;
const CARD_WIDTH = 340;
const EXIT_OFFSET = CARD_WIDTH * 1.4;
const VELOCITY_FACTOR = 0.2;
const VELOCITY_THRESHOLD = 350;
const ROTATION_DEG = 18;
const DRAG_THRESHOLD_DETAILS_PX = 5;

const SPRING = { type: "spring" as const, stiffness: 350, damping: 40, mass: 1 };

export function CardFace({ restaurant }: { restaurant: RestaurantRow }) {
  const image = restaurant.photos?.[0] ?? null;
  const cuisineLabel = Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(", ") : "";
  const priceLabel = restaurant.price_range ?? "€€";
  const addressLabel = restaurant.address ?? `${restaurant.name} Paris`;
  return (
    <div className="relative h-full w-full overflow-hidden bg-neutral-900">
      {image ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={image}
          alt={restaurant.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-red-600" aria-label="Image manquante" />
      )}
      {/* Dégradé du bas vers le haut, remonte assez pour couvrir tout le texte */}
      <div
        className="absolute inset-0 z-[2] bg-gradient-to-t from-black/95 via-black/60 to-transparent"
        aria-hidden
      />
      {/* Bloc texte (Nom + Infos) : espacement resserré (gap-1), au-dessus du badge */}
      <div className="absolute bottom-[80px] left-0 right-0 z-[3] flex flex-col gap-1 p-5 pt-20">
        <h2 className="text-xl font-bold text-white drop-shadow-md">{restaurant.name}</h2>
        <p className="text-xs text-neutral-400">
          {cuisineLabel} &#8226; {priceLabel}
        </p>
      </div>

      {/* Badge adresse : à gauche, bien au-dessus des boutons Cœur/Croix */}
      <div className="absolute bottom-14 left-0 right-0 z-[999] flex justify-start px-5 pointer-events-none">
        <a
          href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(restaurant.name + " " + addressLabel)}
          target="_blank"
          rel="noopener noreferrer"
          title="Ouvrir dans Maps"
          role="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            window.open(
              "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(restaurant.name + " " + addressLabel),
              "_blank"
            );
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto flex min-h-[40px] w-fit max-w-[calc(100%-2rem)] cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-black/90 px-3 py-1.5 text-xs text-white shadow-lg transition hover:scale-105 hover:bg-black/95 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-400/90" strokeWidth={2} aria-hidden />
          <span className="min-w-0 truncate">{addressLabel}</span>
          <ExternalLink className="h-3 w-3 shrink-0 text-white/60" strokeWidth={2} aria-hidden />
        </a>
      </div>
    </div>
  );
}

interface SwipeCardProps {
  restaurant: RestaurantRow;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onDetailsRequest?: () => void;
}

export default function SwipeCard({
  restaurant,
  onSwipeLeft,
  onSwipeRight,
  onDetailsRequest,
}: SwipeCardProps) {
  const x = useMotionValue(0);
  const isExiting = useRef(false);
  const didDragBeyondThreshold = useRef(false);

  // Rotation naturelle : max 18° liée à la position X (GPU via useTransform)
  const rotate = useTransform(
    x,
    [-CARD_WIDTH * 0.5, 0, CARD_WIDTH * 0.5],
    [-ROTATION_DEG, 0, ROTATION_DEG]
  );

  const opacity = useTransform(
    x,
    [-CARD_WIDTH * 0.5, -CARD_WIDTH * 0.2, 0, CARD_WIDTH * 0.2, CARD_WIDTH * 0.5],
    [0.5, 0.88, 1, 0.88, 0.5]
  );

  // Overlay MIAM (vert) : fondu progressif vers la droite
  const miamOpacity = useTransform(x, [0, 40, 100, 150], [0, 0.35, 0.75, 0.95]);

  // Overlay BOF (rouge) : fondu progressif vers la gauche
  const bofOpacity = useTransform(x, [0, -40, -100, -150], [0, 0.35, 0.75, 0.95]);

  const exitLeft = useCallback(
    (velocityX: number = 0) => {
      if (isExiting.current) return;
      isExiting.current = true;
      animate(x, -EXIT_OFFSET, {
        ...SPRING,
        velocity: velocityX,
        onComplete: () => {
          onSwipeLeft?.();
        },
      });
    },
    [x, onSwipeLeft]
  );

  const exitRight = useCallback(
    (velocityX: number = 0) => {
      if (isExiting.current) return;
      isExiting.current = true;
      animate(x, EXIT_OFFSET, {
        ...SPRING,
        velocity: velocityX,
        onComplete: () => {
          onSwipeRight?.();
        },
      });
    },
    [x, onSwipeRight]
  );

  const handleDragStart = useCallback(() => {
    didDragBeyondThreshold.current = false;
  }, []);

  const handleDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > DRAG_THRESHOLD_DETAILS_PX) {
      didDragBeyondThreshold.current = true;
    }
  }, []);

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (isExiting.current) return;
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;

    // Flick : prise en compte de la vélocité pour la décision de sortie
    const projectedX = offsetX + velocityX * VELOCITY_FACTOR;
    const isFastFlick =
      Math.abs(velocityX) > VELOCITY_THRESHOLD &&
      Math.sign(velocityX) === Math.sign(offsetX);

    if (projectedX > SWIPE_THRESHOLD_PX || (isFastFlick && velocityX > 0)) {
      exitRight(velocityX);
    } else if (projectedX < -SWIPE_THRESHOLD_PX || (isFastFlick && velocityX < 0)) {
      exitLeft(velocityX);
    } else {
      animate(x, 0, SPRING);
    }
  }

  // Au tap (sans swipe), ouvre le volet de détails — sauf si le clic est sur le badge adresse
  const handleTap = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!didDragBeyondThreshold.current && !target?.closest?.('a[title="Ouvrir dans Maps"]')) {
        onDetailsRequest?.();
      }
    },
    [onDetailsRequest]
  );

  return (
    <>
      <motion.div
        className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing rounded-2xl overflow-hidden shadow-2xl"
        style={{
          x,
          rotate,
          opacity,
          willChange: "transform",
          backfaceVisibility: "hidden",
        }}
        drag="x"
        dragConstraints={{ left: -EXIT_OFFSET, right: EXIT_OFFSET }}
        dragElastic={0.8}
        dragListener
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
        whileTap={{ scale: 1.02 }}
      >
        <div className="relative h-full w-full" style={{ transform: "translateZ(0)" }}>
          <CardFace restaurant={restaurant} />
          {/* Overlay MIAM (vert) — fondu progressif */}
          <motion.div
            className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center"
            style={{ opacity: miamOpacity }}
            aria-hidden
          >
            <span className="rounded-2xl border-2 border-green-400/90 bg-green-500/30 px-8 py-3 text-2xl font-bold uppercase tracking-widest text-green-200 shadow-lg">
              Miam
            </span>
          </motion.div>
          {/* Overlay BOF (rouge) — fondu progressif */}
          <motion.div
            className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center"
            style={{ opacity: bofOpacity }}
            aria-hidden
          >
            <span className="rounded-2xl border-2 border-red-400/90 bg-red-500/30 px-8 py-3 text-2xl font-bold uppercase tracking-widest text-red-200 shadow-lg">
              Bof
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Boutons en bas */}
      <div className="absolute -bottom-2 left-0 right-0 flex justify-center gap-8 pt-4">
        <button
          type="button"
          onClick={() => exitLeft(0)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 shadow-lg transition hover:scale-110 hover:bg-red-500/90 active:scale-95"
          aria-label="Refuser"
        >
          <svg
            className="h-7 w-7 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => exitRight(0)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 shadow-lg transition hover:scale-110 hover:bg-green-500/90 active:scale-95"
          aria-label="J'aime"
        >
          <svg
            className="h-7 w-7 text-green-400"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>
    </>
  );
}
