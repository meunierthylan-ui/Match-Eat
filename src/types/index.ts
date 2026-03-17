export interface Restaurant {
  id: number;
  name: string;
  district: string;
  description: string;
  address: string;
  priceRange: string;
  cuisine: string;
  img: string | null;
  gallery: string[];
  /** Lien vers le profil Instagram du restaurant (optionnel). */
  instagramUrl?: string;
  /** Lien vers une recherche TikTok sur le nom du restaurant (optionnel). */
  tiktokUrl?: string;
  note: number;
}

/** Forme des lignes retournées par Supabase (noms de colonnes SQL). */
export interface SupabaseRestaurant {
  id: number;
  name: string;
  cuisine: string[];
  price_range: string | null;
  district: string | null;
  description: string | null;
  address: string | null;
  photos: string[];
  instagram_url: string | null;
  tiktok_url: string | null;
}

/** Image par défaut si pas de photo (placeholder gris). */
export const DEFAULT_RESTAURANT_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23374151' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='18' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3ERestaurant%3C/text%3E%3C/svg%3E";

/** Vrai seulement si l’URL est utilisable par une balise img (http, https ou data). */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (typeof url !== "string" || !url.trim()) return false;
  const u = url.trim();
  return u.startsWith("http://") || u.startsWith("https://") || u.startsWith("data:");
}

/** Normalise le tableau photos (Supabase peut renvoyer un format inattendu). */
function normalizePhotos(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === "string") : [raw];
    } catch {
      return [raw];
    }
  }
  return [];
}

/** Convertit une ligne Supabase en type Restaurant (affichage). */
export function mapSupabaseToRestaurant(row: SupabaseRestaurant): Restaurant {
  const photos = normalizePhotos(row.photos);
  const img = photos.length > 0 ? photos[0] : null;
  const cuisineStr = Array.isArray(row.cuisine) ? row.cuisine.join(", ") : "";
  return {
    id: row.id,
    name: row.name ?? "",
    district: row.district ?? "",
    description: row.description ?? "",
    address: row.address ?? "",
    priceRange: row.price_range ?? "€€",
    cuisine: cuisineStr,
    img,
    gallery: photos,
    instagramUrl: row.instagram_url ?? undefined,
    tiktokUrl: row.tiktok_url ?? undefined,
    note: 4,
  };
}