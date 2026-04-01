"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/lib/supabase";
import FilterBar, { type FilterState } from "@/components/FilterBar";
import MatchOverlay from "@/components/MatchOverlay";
import RestaurantDrawer from "@/components/RestaurantDrawer";
import SwipeCard, { CardFace } from "@/components/SwipeCard";
import type { RestaurantRow } from "@/types/database.types";

interface RestaurantDetailsRow {
  description: string | null;
  address: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
}

function getPriceLevel(priceRange: string): string {
  const match = priceRange.match(/^(€+)/);
  return match ? match[1] : "";
}

function parseArrondissementNum(value: string): number | null {
  const m = value.match(/^(\d+)e?r?$/);
  return m ? parseInt(m[1], 10) : null;
}

/** Mélange Fisher-Yates : retourne une nouvelle liste, ne modifie pas l'originale. */
function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Mélange déterministe à partir d'un seed (ex: code groupe). Même code = même ordre. */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const GROUP_POOL_SIZE = 10;

function formatFiltersSummary(filters: FilterState): string {
  const parts: string[] = [];
  if (filters.cuisine?.length) parts.push(filters.cuisine.join(", "));
  if (filters.arrondissement?.length) parts.push(filters.arrondissement.join(", "));
  if (filters.prix?.length) parts.push(filters.prix.join(" "));
  if (filters.ambiance?.length) parts.push(filters.ambiance.join(", "));
  return parts.length ? parts.join(" • ") : "Tous les critères";
}

/** Filtre avec les noms de colonnes SQL (price_range, district, cuisine array). */
function filterRestaurants(list: RestaurantRow[], filters: FilterState): RestaurantRow[] {
  return list.filter((r) => {
    if (Array.isArray(filters.prix) && filters.prix.length > 0) {
      const level = getPriceLevel(r.price_range ?? "");
      if (!filters.prix.includes(level)) return false;
    }
    if (Array.isArray(filters.cuisine) && filters.cuisine.length > 0) {
      const cuisineArr = Array.isArray(r.cuisine) ? r.cuisine : [];
      const descCuisine = cuisineArr.map((c) => (c ?? "").toLowerCase()).join(" ");
      const match = filters.cuisine.some((c) =>
        descCuisine.includes((c ?? "").toLowerCase())
      );
      if (!match) return false;
    }
    if (Array.isArray(filters.ambiance) && filters.ambiance.length > 0) {
      const desc = r.description?.toLowerCase() ?? "";
      // La description est chargée à l'ouverture du détail : on n'applique
      // ce filtre que si la description est disponible dans la ligne listée.
      if (desc) {
        const match = filters.ambiance.some((a) =>
          desc.includes((a ?? "").toLowerCase())
        );
        if (!match) return false;
      }
    }
    if (Array.isArray(filters.arrondissement) && filters.arrondissement.length > 0) {
      const districtMatch = (r.district ?? "").match(/\d+/);
      const rawNum = districtMatch ? parseInt(districtMatch[0], 10) : null;
      const districtNum =
        rawNum !== null && rawNum >= 75001 && rawNum <= 75020
          ? rawNum - 75000
          : rawNum;
      const match = filters.arrondissement.some((arr) => {
        const n = parseArrondissementNum(arr ?? "");
        return n !== null && districtNum !== null && n === districtNum;
      });
      if (!match) return false;
    }
    return true;
  });
}

const SAVED_FAVORITES_KEY = "match-eat-favorites";
const GROUP_SESSION_KEY_PREFIX = "match-eat-group-";

type View = "home" | "setup_solo" | "solo" | "group" | "favorites";
type GroupStep = "choose" | "create" | "join" | "lobby" | "swipe";

function generateGroupCode(): string {
  return String(1000 + Math.floor(Math.random() * 9000));
}

const STACK_SIZE = 2;
const STACK_OFFSET = 8;
const STACK_SCALE_STEP = 0.03;

function getMapsUrl(restaurant: RestaurantRow): string {
  const query = encodeURIComponent(
    restaurant.address || `${restaurant.name} ${restaurant.district ?? ""} Paris`
  );
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function FavoritesMap({ restaurants }: { restaurants: RestaurantRow[] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (typeof window === "undefined") return;
    const g = (window as any).google;
    if (!g?.maps) return;

    const map = new g.maps.Map(mapRef.current, {
      zoom: 13,
      center: { lat: 48.8566, lng: 2.3522 },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const bounds = new g.maps.LatLngBounds();
    const withCoords = restaurants.filter(
      (r) =>
        typeof r.latitude === "number" &&
        typeof r.longitude === "number" &&
        !Number.isNaN(r.latitude) &&
        !Number.isNaN(r.longitude),
    );
    if (withCoords.length === 0) return;

    withCoords.forEach((restaurant) => {
      const position = { lat: restaurant.latitude, lng: restaurant.longitude };
      const marker = new g.maps.Marker({
        map,
        position,
        title: restaurant.name,
      });

      const mapsUrl = getMapsUrl(restaurant);
      const infoWindow = new g.maps.InfoWindow({
        content: `
          <div style="padding:8px;font-size:13px;">
            <strong>${restaurant.name}</strong><br/>
            <a href="${mapsUrl}" target="_blank" rel="noopener" style="color:#4ade80;text-decoration:none;">
              Y aller
            </a>
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open({ anchor: marker, map, shouldFocus: false });
      });

      bounds.extend(position);
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds);
    }
  }, [restaurants]);

  if (restaurants.length === 0) return null;

  return (
    <div className="mb-3 h-64 w-full overflow-hidden rounded-2xl border border-white/10 bg-neutral-900">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
}

function getPrimaryPhoto(restaurant: RestaurantRow): string | null {
  return restaurant.photos?.[0] ?? null;
}

function triggerFirstFavoriteConfetti() {
  const count = 80;
  const defaults = { origin: { y: 0.6 }, zIndex: 9999 };
  confetti({ ...defaults, particleCount: count, spread: 70 });
  confetti({ ...defaults, particleCount: count * 0.4, angle: 60, spread: 55 });
  confetti({ ...defaults, particleCount: count * 0.4, angle: 120, spread: 55 });
}

function IconUser() {
  return (
    <svg className="h-10 w-10 sm:h-12 sm:w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg className="h-10 w-10 sm:h-12 sm:w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function IconBack() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

async function loadSavedRestaurants(): Promise<RestaurantRow[]> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_FAVORITES_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];

    const ids = data
      .map((item: Record<string, unknown>) =>
        typeof item.id === "number" ? item.id : Number(item.id) || 0,
      )
      .filter((id: number) => id > 0);

    if (!supabase || ids.length === 0) return [];

    const { data: rows, error } = await supabase
      .from("restaurants")
      .select("*, latitude, longitude")
      .in("id", ids);

    if (error || !rows) {
      console.error("loadSavedRestaurants supabase error:", error);
      return [];
    }

    const byId = new Map<number, RestaurantRow>(
      (rows as RestaurantRow[]).map((r) => [r.id, r]),
    );

    return ids
      .map((id) => byId.get(id))
      .filter((r): r is RestaurantRow => Boolean(r));
  } catch (err) {
    console.error("loadSavedRestaurants error:", err);
    return [];
  }
}

const initialFilters: FilterState = {
  prix: [],
  cuisine: [],
  ambiance: [],
  arrondissement: [],
};

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [savedRestaurants, setSavedRestaurants] = useState<RestaurantRow[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [favorites, setFavorites] = useState<RestaurantRow[]>([]);
  const [groupStep, setGroupStep] = useState<GroupStep>("choose");
  const [groupCode, setGroupCode] = useState("");
  const [groupReadyCount, setGroupReadyCount] = useState(0);
  const [groupWaitingMessage, setGroupWaitingMessage] = useState<string | null>(null);
  const [setupNoResultsAlert, setSetupNoResultsAlert] = useState(false);
  const [selectedRestaurantForDetails, setSelectedRestaurantForDetails] = useState<RestaurantRow | null>(null);
  const [groupRestaurants, setGroupRestaurants] = useState<RestaurantRow[]>([]);
  const [groupVotes, setGroupVotes] = useState<Record<number, number>>({});
  const [groupMatchRestaurant, setGroupMatchRestaurant] = useState<RestaurantRow | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [groupFiltersOpen, setGroupFiltersOpen] = useState(false);
  const [showFavoritesMap, setShowFavoritesMap] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchRestaurants() {
      if (!supabase) {
        setRestaurants([]);
        setRestaurantsLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("restaurants")
        .select(
          "id, name, cuisine, price_range, district, photos, is_solo_friendly, google_rating, google_rating_count, latitude, longitude",
        );
      if (cancelled) return;
      if (error) {
        console.error("Supabase restaurants:", error);
        setRestaurants([]);
      } else {
        const list = (data as RestaurantRow[]) ?? [];
        console.log("restaurants from Supabase:", list);
        setRestaurants(list);
      }
      setRestaurantsLoading(false);
    }
    fetchRestaurants();
    return () => { cancelled = true; };
  }, []);

  const rawFiltered = useMemo(
    () => filterRestaurants(restaurants, filters),
    [restaurants, filters]
  );
  const filteredRestaurants = useMemo(() => shuffleArray(rawFiltered), [rawFiltered]);

  const openRestaurantDetails = useCallback(
    async (restaurant: RestaurantRow | undefined) => {
      if (!restaurant) return;
      setSelectedRestaurantForDetails(restaurant);
      if (!supabase) return;

      const { data, error } = await supabase
        .from("restaurants")
        .select("description, address, instagram_url, tiktok_url")
        .eq("id", restaurant.id)
        .maybeSingle();

      if (error || !data) return;
      const details = data as RestaurantDetailsRow;

      setSelectedRestaurantForDetails((prev) =>
        prev && prev.id === restaurant.id
          ? {
              ...prev,
              description: details.description ?? prev.description,
              address: details.address ?? prev.address,
              instagram_url: details.instagram_url ?? prev.instagram_url,
              tiktok_url: details.tiktok_url ?? prev.tiktok_url,
            }
          : prev
      );
    },
    []
  );

  const isGroupSwipe = view === "group" && groupStep === "swipe";
  const displayRestaurants = isGroupSwipe ? groupRestaurants : filteredRestaurants;
  const currentRestaurant = displayRestaurants[cardIndex];
  const isEnd = cardIndex >= displayRestaurants.length;

  const visibleCards = useMemo(
    () => displayRestaurants.slice(cardIndex, cardIndex + 3),
    [displayRestaurants, cardIndex]
  );

  const launchGroupSwipe = useCallback(
    (code: string, filtersOverride?: FilterState) => {
      const filtersToUse = filtersOverride ?? filters;
      const filtered = filterRestaurants(restaurants, filtersToUse);
      const poolSource = filtered.length > 0 ? filtered : restaurants;
      const sorted = [...poolSource].sort((a, b) => a.id - b.id);
      const seed = parseInt(code, 10) || 0;
      const shuffled = seededShuffle(sorted, seed);
      const pool = shuffled.slice(0, GROUP_POOL_SIZE);
      setGroupRestaurants(pool);
      setGroupVotes({});
      setGroupMatchRestaurant(null);
      setCardIndex(0);
      setGroupStep("swipe");
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            GROUP_SESSION_KEY_PREFIX + code,
            JSON.stringify({ filters: filtersToUse })
          );
        } catch {
          // ignore
        }
      }
    },
    [filters, restaurants]
  );

  const loadGroupSession = useCallback((code: string): FilterState | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(GROUP_SESSION_KEY_PREFIX + code);
      if (!raw) return null;
      const data = JSON.parse(raw) as { filters?: FilterState };
      return data?.filters ?? null;
    } catch {
      return null;
    }
  }, []);

  const handleFilterChange = useCallback((key: keyof FilterState, value: string | null) => {
    setFilters((prev) => {
      const arr = prev[key];
      if (!Array.isArray(arr) || value === null) return prev;
      const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
    setCardIndex(0);
  }, []);

  const goToGroupChoose = () => {
    setGroupStep("choose");
    setGroupCode("");
    setGroupReadyCount(0);
    setGroupFiltersOpen(false);
  };

  const goHome = () => {
    setView("home");
    goToGroupChoose();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await loadSavedRestaurants();
      if (!cancelled) {
        setSavedRestaurants(rows);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (savedRestaurants.length > 0 && typeof window !== "undefined") {
      localStorage.setItem(SAVED_FAVORITES_KEY, JSON.stringify(savedRestaurants));
    }
  }, [savedRestaurants]);

  const goNext = () => setCardIndex((i) => i + 1);

  const handleSwipeRight = useCallback(() => {
    if (!currentRestaurant) return;
    if (isGroupSwipe) {
      const id = currentRestaurant.id;
      setGroupVotes((prev) => ({
        ...prev,
        [id]: (prev[id] || 0) + groupReadyCount,
      }));
      goNext();
      return;
    }
    setFavorites((prev) => {
      const isFirst = prev.length === 0;
      if (isFirst) setTimeout(triggerFirstFavoriteConfetti, 200);
      return [...prev, currentRestaurant];
    });
    if (view === "solo") {
      setSavedRestaurants((prev) => {
        if (prev.some((r) => r.id === currentRestaurant.id)) return prev;
        return [...prev, currentRestaurant];
      });
    }
    goNext();
  }, [currentRestaurant, view, isGroupSwipe, groupReadyCount]);

  const handleSwipeLeft = useCallback(() => {
    goNext();
  }, []);

  const restart = () => {
    setCardIndex(0);
    setFavorites([]);
  };

  const handleRemoveFavorite = useCallback((id: number) => {
    setSavedRestaurants((prev) => prev.filter((r) => r.id !== id));
    setFavorites((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Loader pendant la récupération des restaurants
  if (restaurantsLoading) {
    return (
      <div className="min-h-screen bg-black font-sans text-white flex flex-col items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" aria-hidden />
        <p className="mt-4 text-sm text-white/70">Chargement des restaurants…</p>
      </div>
    );
  }

  // Écran d'accueil
  if (view === "home") {
    return (
      <div className="min-h-screen bg-black font-sans text-white">
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center overflow-y-auto px-6 py-8 sm:max-w-lg">
          <motion.div
            className="flex flex-col items-center gap-3 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-4xl font-bold tracking-tight text-transparent drop-shadow-[0_0_20px_rgba(251,191,36,0.3)] sm:text-5xl">
              Match & Eat
            </h1>
            <p className="text-lg text-white/70 sm:text-xl">
              Où dîne-t-on à Paris ce soir ?
            </p>
          </motion.div>
          <div className="mt-14 flex w-full max-w-[320px] flex-col gap-4 sm:max-w-[360px]">
            <motion.button
              type="button"
              onClick={() => setView("setup_solo")}
              className="group flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-950/50 to-black py-6 shadow-[0_0_30px_rgba(251,191,36,0.08)] transition hover:border-amber-400/60 hover:shadow-[0_0_40px_rgba(251,191,36,0.15)] active:scale-[0.98]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              <span className="text-amber-300/90 group-hover:text-amber-200">
                <IconUser />
              </span>
              <span className="text-lg font-semibold text-white">Manger seul</span>
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setView("group")}
              className="group flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-950/50 to-black py-6 shadow-[0_0_30px_rgba(251,191,36,0.08)] transition hover:border-amber-400/60 hover:shadow-[0_0_40px_rgba(251,191,36,0.15)] active:scale-[0.98]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              <span className="text-amber-300/90 group-hover:text-amber-200">
                <IconUsers />
              </span>
              <span className="text-lg font-semibold text-white">Décider à plusieurs</span>
            </motion.button>
          </div>

          {/* Section Mes Favoris */}
          <motion.section
            className="mt-12 w-full max-w-[320px] sm:max-w-[360px]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <div className="flex items-center justify-between gap-2 px-1">
              <h2 className="text-sm font-medium text-white/80">Mes Favoris</h2>
              {savedRestaurants.length > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-300/90 ring-1 ring-amber-500/30">
                  {savedRestaurants.length}
                </span>
              )}
            </div>
            {savedRestaurants.length > 0 ? (
              <>
                <div className="mt-3 flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {savedRestaurants.map((restaurant, index) => (
                    <button
                      type="button"
                      key={`${restaurant.id}-${index}`}
                      onClick={() => setView("favorites")}
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-md transition hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(251,191,36,0.1)] active:scale-[0.98]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {getPrimaryPhoto(restaurant) ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={getPrimaryPhoto(restaurant) ?? undefined}
                          alt={restaurant.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-red-600" aria-label="Image manquante" />
                      )}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setView("favorites")}
                  className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/10"
                >
                  Voir tout
                </button>
              </>
            ) : (
              <p className="mt-2 text-xs text-white/50">Aucun favori pour le moment.</p>
            )}
          </motion.section>
        </main>
      </div>
    );
  }

  // ——— Écran de configuration solo (filtres) ———
  if (view === "setup_solo") {
    const handleLaunchSearch = () => {
      if (filteredRestaurants.length > 0) {
        setSetupNoResultsAlert(false);
        setCardIndex(0);
        setView("solo");
      } else {
        setSetupNoResultsAlert(true);
      }
    };

    return (
      <div className="min-h-screen bg-black font-sans text-white">
        <main className="mx-auto flex min-h-screen max-w-md flex-col sm:max-w-lg">
          <header className="shrink-0 px-4 pt-4">
            <div className="flex items-center gap-3 pb-2">
              <button
                type="button"
                onClick={() => { setSetupNoResultsAlert(false); setView("home"); }}
                className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
                aria-label="Retour"
              >
                <IconBack />
                <span>Retour</span>
              </button>
            </div>
            <h1 className="py-2 text-center text-xl font-semibold tracking-tight text-white">
              Manger seul
            </h1>
          </header>

          <section className="flex flex-1 flex-col overflow-y-auto px-4 pb-6">
            <h2 className="mb-4 pt-2 text-center text-lg font-medium text-amber-200/95">
              Tes envies du moment
            </h2>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg">
              <FilterBar filters={filters} onFilterChange={handleFilterChange} />
            </div>

            {setupNoResultsAlert && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200"
              >
                Aucun resto trouvé avec ces critères, élargis ta recherche !
              </motion.p>
            )}

            <div className="mt-auto pt-8">
              {(filters.prix.length > 0 ||
                filters.cuisine.length > 0 ||
                filters.ambiance.length > 0 ||
                filters.arrondissement.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilters(initialFilters);
                    setCardIndex(0);
                    setSetupNoResultsAlert(false);
                  }}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white/50 transition hover:text-white"
                  aria-label="Réinitialiser les filtres"
                >
                  <RotateCcw className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Réinitialiser
                </button>
              )}
              <motion.button
                type="button"
                onClick={handleLaunchSearch}
                className="w-full rounded-2xl bg-amber-500 py-4 text-lg font-semibold text-black shadow-[0_0_24px_rgba(251,191,36,0.25)] transition hover:bg-amber-400 active:scale-[0.99]"
              >
                Lancer la recherche
              </motion.button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // Vue Favoris (grille complète des restos enregistrés)
  if (view === "favorites") {
    return (
      <div className="min-h-screen bg-black font-sans text-white">
        <main className="mx-auto flex min-h-screen max-w-md flex-col sm:max-w-lg">
          <header className="shrink-0 px-4 pt-4">
            <div className="flex items-center justify-between gap-3 pb-2">
              <button
                type="button"
                onClick={() => setView("home")}
                className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
                aria-label="Retour au menu"
              >
                <IconBack />
                <span>Retour</span>
              </button>
              {savedRestaurants.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowFavoritesMap((v) => !v)}
                  className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-500/20"
                >
                  {showFavoritesMap ? "Masquer la carte" : "Voir sur la carte"}
                </button>
              )}
            </div>
            <h1 className="py-2 text-center text-xl font-semibold tracking-tight text-white">
              Mes Favoris
            </h1>
          </header>
          <section className="flex-1 overflow-y-auto px-4 pb-8">
            {savedRestaurants.length === 0 ? (
              <p className="py-12 text-center text-white/60">Aucun restaurant enregistré.</p>
            ) : (
              <>
                {showFavoritesMap && <FavoritesMap restaurants={savedRestaurants} />}
                <div className="grid grid-cols-2 gap-3">
                  {savedRestaurants.map((restaurant, index) => {
                    const googleRating =
                      typeof restaurant.google_rating === "number"
                        ? restaurant.google_rating.toFixed(1)
                        : null;
                    return (
                      <motion.article
                        key={`${restaurant.id}-${index}`}
                        className="overflow-hidden rounded-xl bg-white/5 shadow-lg"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.04, duration: 0.3 }}
                      >
                        <div className="relative aspect-[3/4] w-full">
                          <button
                            type="button"
                            onClick={() => openRestaurantDetails(restaurant)}
                            className="group relative block h-full w-full text-left"
                          >
                            {getPrimaryPhoto(restaurant) ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={getPrimaryPhoto(restaurant) ?? undefined}
                                alt={restaurant.name}
                                className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform"
                              />
                            ) : (
                              <div className="h-full w-full bg-red-600" aria-label="Image manquante" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                              <h3 className="truncate text-sm font-semibold text-white drop-shadow-md">
                                {restaurant.name}
                              </h3>
                              <p className="truncate text-[11px] text-white/80">
                                {restaurant.cuisine.join(", ") || "Restaurant"}
                              </p>
                              <p className="truncate text-[11px] text-white/70">
                                {restaurant.price_range ?? "€€"}
                                {googleRating != null && <> · ⭐ {googleRating}</>}
                              </p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFavorite(restaurant.id)}
                            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-[11px] text-white hover:bg-black/90"
                            aria-label="Retirer des favoris"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="p-2">
                          <a
                            href={getMapsUrl(restaurant)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white transition hover:bg-green-500 active:scale-[0.98]"
                          >
                            <span>Y aller</span>
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    );
  }

  // ——— Vue Groupe : choix Créer / Rejoindre ———
  if (view === "group" && groupStep !== "swipe") {
    return (
      <div className="min-h-screen bg-black font-sans text-white">
        <main className="mx-auto flex min-h-screen max-w-md flex-col sm:max-w-lg">
          <header className="shrink-0 px-4 pt-4">
            <div className="flex items-center gap-3 pb-2">
              <button
                type="button"
                onClick={() => (groupStep === "choose" ? goHome() : goToGroupChoose())}
                className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
                aria-label="Retour"
              >
                <IconBack />
                <span>Retour</span>
              </button>
            </div>
            <h1 className="py-2 text-center text-xl font-semibold tracking-tight text-white">
              Décider à plusieurs
            </h1>
          </header>

          <section className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
            {groupStep === "choose" && (
              <motion.div
                className="flex w-full max-w-[320px] flex-col gap-4 sm:max-w-[360px]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setGroupStep("create");
                    setGroupCode(generateGroupCode());
                    setGroupReadyCount(1);
                  }}
                  className="flex min-h-[72px] items-center justify-center gap-3 rounded-2xl border border-amber-500/40 bg-white/5 py-4 transition hover:bg-white/10"
                >
                  <span className="text-lg font-semibold text-white">Créer un groupe</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGroupStep("join")}
                  className="flex min-h-[72px] items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/5 py-4 transition hover:bg-white/10"
                >
                  <span className="text-lg font-semibold text-white">Rejoindre un groupe</span>
                </button>
              </motion.div>
            )}

            {groupStep === "create" && groupFiltersOpen && (
              <motion.div
                className="flex w-full max-w-[320px] flex-col gap-4 sm:max-w-[360px]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-center text-lg font-medium text-amber-200/95">
                  Envies du groupe
                </h2>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg">
                  <FilterBar filters={filters} onFilterChange={handleFilterChange} />
                </div>
                <button
                  type="button"
                  onClick={() => setGroupFiltersOpen(false)}
                  className="w-full rounded-2xl bg-amber-500 py-3.5 font-semibold text-black transition hover:bg-amber-400"
                >
                  Valider les filtres
                </button>
              </motion.div>
            )}

            {groupStep === "create" && !groupFiltersOpen && (
              <motion.div
                className="flex w-full max-w-[320px] flex-col items-center gap-6 sm:max-w-[360px]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-center text-white/80">
                  Partage ce code avec tes amis
                </p>
                <div className="rounded-2xl border-2 border-amber-500/50 bg-black/50 px-8 py-4">
                  <span className="text-4xl font-bold tracking-[0.4em] text-amber-200">
                    {groupCode}
                  </span>
                </div>
                <p className="text-sm text-white/60">
                  {groupReadyCount} personne{groupReadyCount > 1 ? "s" : ""} prête
                  {groupReadyCount > 1 ? "s" : ""}
                </p>
                <button
                  type="button"
                  onClick={() => setGroupReadyCount((c) => Math.min(c + 1, 4))}
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
                >
                  Simuler un ami
                </button>
                <button
                  type="button"
                  onClick={() => setGroupFiltersOpen(true)}
                  className="w-full rounded-2xl border border-white/20 bg-white/5 py-3.5 font-medium text-white/90 transition hover:bg-white/10"
                >
                  Configurer les envies du groupe
                </button>
                <div className="w-full space-y-2 text-center">
                  <p className="text-xs text-white/50">Filtres appliqués</p>
                  <p className="min-h-[1.25rem] text-sm text-amber-200/90">
                    {formatFiltersSummary(filters)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={groupReadyCount < 2}
                  onClick={() => launchGroupSwipe(groupCode)}
                  className="w-full rounded-2xl bg-amber-500 py-3.5 font-semibold text-black transition hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Lancer le swipe
                </button>
              </motion.div>
            )}

            {groupStep === "join" && (
              <motion.div
                className="flex w-full max-w-[320px] flex-col gap-4 sm:max-w-[360px]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label className="text-sm text-white/70" htmlFor="group-code">
                  Code à 4 chiffres
                </label>
                <input
                  id="group-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="0000"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-center text-2xl tracking-[0.3em] text-white placeholder:text-white/40"
                />
                <button
                  type="button"
                  onClick={() => {
                    const code = joinCodeInput || "1000";
                    setGroupCode(code);
                    setGroupReadyCount(2);
                    const sessionFilters = loadGroupSession(code);
                    if (sessionFilters) setFilters(sessionFilters);
                    launchGroupSwipe(code, sessionFilters ?? undefined);
                  }}
                  className="w-full rounded-2xl bg-amber-500 py-3.5 font-semibold text-black transition hover:bg-amber-400"
                >
                  Rejoindre
                </button>
              </motion.div>
            )}
          </section>
        </main>
      </div>
    );
  }

  // ——— Vue Solo ou Groupe (swipe) ———
  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <main className="mx-auto flex min-h-screen max-w-md flex-col sm:max-w-lg">
        <header className="absolute left-0 right-0 top-0 z-20 flex w-full flex-col gap-2 px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goHome}
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-2.5 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Retour au menu"
            >
              <IconBack />
              <span>Retour</span>
            </button>
            {!isEnd && isGroupSwipe && displayRestaurants.length > 0 && (
              <span className="text-xs font-medium text-white/50" aria-live="polite">
                {Math.min(cardIndex + 1, displayRestaurants.length)}/{displayRestaurants.length}
              </span>
            )}
          </div>
          {!isEnd && isGroupSwipe && displayRestaurants.length > 0 && (
            <div
              className="h-0.5 w-full overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-valuenow={cardIndex + 1}
              aria-valuemin={0}
              aria-valuemax={displayRestaurants.length}
              aria-label="Progression des cartes"
            >
              <div
                className="h-full rounded-full bg-amber-400/70 transition-all duration-300"
                style={{
                  width: `${((cardIndex + 1) / displayRestaurants.length) * 100}%`,
                }}
              />
            </div>
          )}
        </header>
        <section className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4 pt-12 pb-20">
          {/* Priorité : si fin de pile, on n'affiche le bloc de fin (solo ou groupe). */}
          {isEnd && view === "group" && (
            <div className="min-h-screen w-full overflow-y-auto bg-black py-12 px-4">
              <div className="flex flex-col items-center justify-center text-center">
                <h2 className="mb-2 text-3xl font-bold text-white">Résultats du Groupe</h2>
                <p className="mb-6 text-gray-400">
                  Les matchs communs, des unanimités au reste
                </p>
                <div className="mb-10 flex flex-wrap items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      restart();
                      setGroupStep("choose");
                      setGroupVotes({});
                    }}
                    className="rounded-full bg-amber-400 px-6 py-3 font-bold text-black"
                  >
                    Recommencer
                  </button>
                  <button
                    type="button"
                    onClick={goHome}
                    className="rounded-full border border-white/20 px-6 py-3 font-bold text-white"
                  >
                    Retour au Menu
                  </button>
                </div>
              </div>
              <div className="mx-auto w-full max-w-[340px] space-y-6 sm:max-w-[360px]">
                {(() => {
                  const withVotes = groupRestaurants
                    .map((r) => ({ restaurant: r, votes: groupVotes[r.id] || 0 }))
                    .filter(({ votes }) => votes > 0)
                    .sort((a, b) => b.votes - a.votes);
                  if (withVotes.length === 0) {
                    return (
                      <p className="text-center text-sm text-gray-500">
                        Aucun like pour cette session.
                      </p>
                    );
                  }
                  const unanimities = withVotes.filter(
                    ({ votes }) => votes >= groupReadyCount
                  );
                  const rest = withVotes.filter(
                    ({ votes }) => votes < groupReadyCount
                  );
                  return (
                    <>
                      {unanimities.length > 0 && (
                        <section>
                          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-300/90">
                            Unanimités
                          </h3>
                          <div className="space-y-3">
                            {unanimities.map(({ restaurant, votes }) => (
                              <article
                                key={restaurant.id}
                                className="flex items-center gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3"
                              >
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  {getPrimaryPhoto(restaurant) ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                      src={getPrimaryPhoto(restaurant) ?? undefined}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full bg-red-600" aria-label="Image manquante" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="truncate font-semibold text-white">
                                    {restaurant.name}
                                  </h4>
                                  <p className="text-xs text-amber-200/80">
                                    {votes} like{votes > 1 ? "s" : ""} · Tout le monde a aimé
                                  </p>
                                </div>
                                <a
                                  href={getMapsUrl(restaurant)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-500"
                                >
                                  Y aller
                                </a>
                              </article>
                            ))}
                          </div>
                        </section>
                      )}
                      {rest.length > 0 && (
                        <section>
                          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
                            Autres likes
                          </h3>
                          <div className="space-y-3">
                            {rest.map(({ restaurant, votes }) => (
                              <article
                                key={restaurant.id}
                                className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3"
                              >
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  {getPrimaryPhoto(restaurant) ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                      src={getPrimaryPhoto(restaurant) ?? undefined}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full bg-red-600" aria-label="Image manquante" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="truncate font-semibold text-white">
                                    {restaurant.name}
                                  </h4>
                                  <p className="text-xs text-white/60">
                                    {votes} like{votes > 1 ? "s" : ""}
                                  </p>
                                </div>
                                <a
                                  href={getMapsUrl(restaurant)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-500"
                                >
                                  Y aller
                                </a>
                              </article>
                            ))}
                          </div>
                        </section>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {isEnd && view !== "group" && (
            <div className="min-h-screen w-full overflow-y-auto bg-black py-12 px-4">
              <div className="flex flex-col items-center justify-center text-center">
                <h2 className="mb-2 text-3xl font-bold text-white">Fini !</h2>
                <p className="mb-8 text-gray-400">Tu as vu tous les restaurants.</p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={restart}
                    className="flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 font-bold text-black"
                  >
                    Recommencer
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("home")}
                    className="flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 font-bold text-white"
                  >
                    Retour au Menu
                  </button>
                </div>
              </div>

              {/* Section Bas : Coups de cœur */}
              <div className="mt-16 w-full max-w-[340px] mx-auto sm:max-w-[360px]">
                <h3 className="mb-4 text-center text-lg font-semibold tracking-tight text-white/95">
                  Tes sélections du moment
                </h3>
                {favorites.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {favorites.map((restaurant, index) => (
                      <article
                        key={`${restaurant.id}-${index}`}
                        className="overflow-hidden rounded-xl bg-white/5 shadow-lg"
                      >
                        <div className="relative aspect-[3/4] w-full">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {getPrimaryPhoto(restaurant) ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={getPrimaryPhoto(restaurant) ?? undefined}
                              alt={restaurant.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-red-600" aria-label="Image manquante" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h4 className="truncate text-sm font-semibold text-white drop-shadow-md">
                              {restaurant.name}
                            </h4>
                            <p className="truncate text-xs text-white/85">
                              {restaurant.district}
                            </p>
                          </div>
                        </div>
                        <div className="p-2">
                          <a
                            href={getMapsUrl(restaurant)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white transition hover:bg-green-500 active:scale-[0.98]"
                          >
                            <span>Y aller</span>
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-gray-500">
                    Pas encore de favoris ? Recommence pour en trouver !
                  </p>
                )}
              </div>
            </div>
          )}

          {!isEnd && displayRestaurants.length === 0 && (
            <div className="relative w-full max-w-[340px] rounded-2xl bg-white/5 px-6 py-8 text-center">
              <p className="text-white/90">Aucun restaurant pour ces filtres.</p>
              <p className="mt-1 text-sm text-white/60">Modifiez Prix, Cuisine ou Ambiance ci-dessus.</p>
            </div>
          )}
          {!isEnd && displayRestaurants.length > 0 && (
            <AnimatePresence initial={false} mode="popLayout">
              <div className="relative w-full max-w-[340px] aspect-[3/4] sm:max-w-[360px]">
                {visibleCards.slice(1).map((restaurant, i) => (
                  <motion.div
                    key={`${restaurant.id}-stack-${i}`}
                    layout
                    className="absolute inset-0 rounded-2xl overflow-hidden shadow-xl"
                    style={{
                      zIndex: STACK_SIZE - i,
                      transform: `scale(${1 - (i + 1) * STACK_SCALE_STEP}) translateY(${(i + 1) * STACK_OFFSET}px)`,
                      transformOrigin: "bottom center",
                    }}
                  >
                    <CardFace restaurant={restaurant} />
                  </motion.div>
                ))}
                {visibleCards[0] && (
                  <motion.div
                    key={visibleCards[0].id}
                    layout
                    className="absolute inset-0 z-[10]"
                    initial={
                      cardIndex === 0
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: 0 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 0, transition: { duration: 0.15 } }}
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 40,
                      mass: 1,
                    }}
                  >
                    <SwipeCard
                      restaurant={visibleCards[0]}
                      onSwipeLeft={handleSwipeLeft}
                      onSwipeRight={handleSwipeRight}
                      onDetailsRequest={() => {
                        void openRestaurantDetails(visibleCards[0]);
                      }}
                    />
                  </motion.div>
                )}
              </div>
            </AnimatePresence>
          )}

          {groupWaitingMessage && view === "group" && (
            <motion.div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="rounded-2xl border border-white/20 bg-black/80 px-8 py-5 shadow-xl">
                <p className="text-lg font-medium text-white">{groupWaitingMessage}</p>
              </div>
            </motion.div>
          )}
          <MatchOverlay groupMatch={groupMatchRestaurant} />
        </section>
        <RestaurantDrawer
          restaurant={selectedRestaurantForDetails}
          isOpen={selectedRestaurantForDetails !== null}
          onClose={() => setSelectedRestaurantForDetails(null)}
          getMapsUrl={getMapsUrl}
        />
      </main>
    </div>
  );
}
