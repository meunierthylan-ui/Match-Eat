/**
 * Script Node.js : récupère les 50 meilleurs restaurants à Paris via Google Places API (Legacy),
 * avec noms, adresses, prix, et URLs des photos. Sortie formatée pour insertion Supabase.
 *
 * Prérequis :
 * - Activer "Places API" (Legacy) dans Google Cloud Console
 *   https://console.cloud.google.com/apis/library/places-backend.googleapis.com
 * - Ajouter dans .env.local : GOOGLE_MAPS_API_KEY=ta_cle
 *
 * Usage : node scripts/fetch-restaurants-google.js
 *        node scripts/fetch-restaurants-google.js > restaurants.json
 *
 * Sortie : tableau JSON (colonnes snake_case) pour insertion directe :
 *   supabase.from('restaurants').insert(rows)
 *
 * Colonnes : name, address, district, price_range, cuisine, img, gallery, description, note
 */

require("dotenv").config({ path: ".env.local" });
const { Client } = require("@googlemaps/google-maps-services-js");

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const TARGET_COUNT = 50;
const PHOTO_MAX_WIDTH = 800;

if (!API_KEY) {
  console.error(
    "Erreur : GOOGLE_MAPS_API_KEY manquant. Ajoute-le dans .env.local"
  );
  process.exit(1);
}

function buildPhotoUrl(photoReference) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${PHOTO_MAX_WIDTH}&photoreference=${encodeURIComponent(photoReference)}&key=${API_KEY}`;
}

function parseDistrict(formattedAddress) {
  const match = formattedAddress?.match(/\b750(\d{2})\b/);
  if (!match) return "Paris";
  const n = parseInt(match[1], 10);
  if (n === 1) return "1er";
  return `${n}e`;
}

function priceLevelToRange(level) {
  if (level == null) return "€€";
  const map = { 0: "€", 1: "€", 2: "€€", 3: "€€€", 4: "€€€€" };
  return map[level] ?? "€€";
}

function typesToCuisine(types) {
  if (!Array.isArray(types) || types.length === 0) return "Restaurant";
  const t = types.filter((x) => x && x !== "point_of_interest" && x !== "establishment");
  if (t.length === 0) return "Restaurant";
  const first = t[0];
  const labels = {
    restaurant: "Restaurant",
    meal_takeaway: "Restaurant",
    meal_delivery: "Restaurant",
    food: "Restaurant",
    bar: "Bar",
    cafe: "Café",
  };
  return labels[first] || first;
}

async function main() {
  const client = new Client({});
  const allResults = [];
  let nextPageToken = null;

  for (let page = 0; page < 3; page++) {
    const params = {
      query: "meilleurs restaurants Paris",
      key: API_KEY,
      language: "fr",
    };
    if (nextPageToken) params.pagetoken = nextPageToken;

    const res = await client.textSearch({
      params,
      timeout: 10000,
    });

    const data = res.data;
    if (!data.results || data.results.length === 0) break;

    allResults.push(...data.results);
    nextPageToken = data.next_page_token || null;
    if (!nextPageToken) break;
    await new Promise((r) => setTimeout(r, 2000));
  }

  const rows = allResults.slice(0, TARGET_COUNT).map((place, index) => {
    const photos = place.photos || [];
    const photoUrls = photos.map((p) => buildPhotoUrl(p.photo_reference));
    const img = photoUrls[0] || "";
    const gallery = photoUrls.slice(0, 5);

    return {
      name: place.name || "",
      address: place.formatted_address || "",
      district: parseDistrict(place.formatted_address),
      price_range: priceLevelToRange(place.price_level),
      cuisine: typesToCuisine(place.types),
      img,
      gallery,
      description: "",
      note: place.rating ? Math.round(place.rating * 10) / 10 : 4,
    };
  });

  console.log(JSON.stringify(rows, null, 2));
}

main().catch((err) => {
  console.error(err.response?.data?.error_message || err.message);
  process.exit(1);
});
