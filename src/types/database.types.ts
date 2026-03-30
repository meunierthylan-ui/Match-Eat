export interface RestaurantRow {
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
  is_solo_friendly: boolean | null;
  google_place_id: string | null;
  google_rating: number | null;
  google_rating_count: number | null;
}
