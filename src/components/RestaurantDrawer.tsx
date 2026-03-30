"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, MapPin } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import type { RestaurantRow } from "@/types/database.types";

/** Galerie : grid 3 colonnes, carrés, clic = Lightbox à l'index correspondant. */
function GalleryGrid({
  images,
  onOpenLightbox,
}: {
  images: string[];
  onOpenLightbox: (index: number) => void;
}) {
  const hasMore = images.length > 3;
  const extraCount = images.length - 3;

  return (
    <div className="grid w-full grid-cols-3 gap-2 rounded-xl overflow-hidden">
      {images.slice(0, 3).map((src, i) => (
        <motion.button
          type="button"
          key={`${src}-${i}`}
          onClick={() => onOpenLightbox(i)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-800 cursor-pointer border-0 p-0 text-left focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          <img
            src={src}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
          {i === 2 && hasMore && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl text-white text-sm font-semibold">
              +{extraCount} photos
            </span>
          )}
        </motion.button>
      ))}
    </div>
  );
}

function getMapsSearchUrl(restaurant: RestaurantRow): string {
  const query = encodeURIComponent(`${restaurant.name} ${restaurant.address ?? "Paris"}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

const BACKDROP = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } };
const DRAWER = {
  initial: { y: "100%" },
  animate: { y: 0 },
  exit: { y: "100%" },
  transition: { type: "spring" as const, damping: 30, stiffness: 300 },
};

interface RestaurantDrawerProps {
  restaurant: RestaurantRow | null;
  isOpen: boolean;
  onClose: () => void;
  getMapsUrl?: (r: RestaurantRow) => string;
}

export default function RestaurantDrawer({
  restaurant,
  isOpen,
  onClose,
}: RestaurantDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(-1);
  const rawPhotos = Array.isArray(restaurant?.photos) ? restaurant.photos : [];
  const galleryImages = rawPhotos.filter(
    (src): src is string => typeof src === "string" && src.trim().length > 0
  );

  useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false);
      setPhotoIndex(-1);
      return;
    }
    const t = setTimeout(() => setIsExpanded(true), 350);
    return () => clearTimeout(t);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && restaurant && (
        <>
          <motion.div
            role="button"
            tabIndex={0}
            aria-label="Fermer"
            className="fixed inset-0 z-[60] bg-black/60"
            {...BACKDROP}
            onClick={onClose}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[70] max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-neutral-900 shadow-2xl"
            initial={DRAWER.initial}
            animate={DRAWER.animate}
            exit={DRAWER.exit}
            transition={DRAWER.transition}
          >
            <div className="sticky top-0 z-10 flex justify-center bg-neutral-900 py-2">
              <div className="h-1.5 w-12 rounded-full bg-white/30" aria-hidden />
            </div>
            {isExpanded && (
            <div className="px-5 pb-5 pt-1 space-y-3">
              {/* 1. Header : nom en très gros et gras */}
              <h2 className="text-3xl font-bold text-white">{restaurant.name}</h2>

              {/* 2. Infos secondaires : cuisine • prix */}
              <p className="text-sm text-white/60">{restaurant.cuisine.join(", ")} &#8226; {restaurant.price_range ?? "€€"}</p>

              {/* 3. Adresse interactive (badge style carte) */}
              <a
                href={getMapsSearchUrl(restaurant)}
                target="_blank"
                rel="noopener noreferrer"
                title="Ouvrir dans Maps"
                className="inline-flex w-fit max-w-full min-h-[36px] items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-xs text-white shadow-lg transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-400/90" strokeWidth={2} aria-hidden />
                <span className="min-w-0 truncate">{restaurant.address ?? `${restaurant.name} Paris`}</span>
                <ExternalLink className="h-3 w-3 shrink-0 text-white/60" strokeWidth={2} aria-hidden />
              </a>

              {/* 4. Description */}
              <p className="text-[15px] leading-relaxed text-white/90">
                {restaurant.description ?? "Description indisponible."}
              </p>

              {/* 5. Galerie photos (layout Instagram) */}
              {galleryImages.length > 0 && (
                <section className="space-y-1.5" aria-label="Galerie photos">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Galerie</h3>
                  <GalleryGrid
                    images={galleryImages}
                    onOpenLightbox={setPhotoIndex}
                  />
                </section>
              )}

              {/* 6. Social links (tout en bas) */}
              {(restaurant.instagram_url ?? restaurant.tiktok_url) && (
                <div className="flex flex-wrap gap-2 pt-0">
                  {restaurant.instagram_url && (
                    <a
                      href={restaurant.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849 1.16-3.26 2.844-4.771 6.003-4.919 1.266-.058 1.644-.07 4.849-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                      Instagram
                    </a>
                  )}
                  {restaurant.tiktok_url && (
                    <a
                      href={restaurant.tiktok_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                      </svg>
                      TikTok
                    </a>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Lightbox : s'ouvre au clic sur une image de la galerie */}
            {galleryImages.length > 0 && (
              <Lightbox
                open={photoIndex >= 0}
                close={() => setPhotoIndex(-1)}
                slides={galleryImages.map((src) => ({ src }))}
                index={photoIndex}
                plugins={[Zoom]}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
