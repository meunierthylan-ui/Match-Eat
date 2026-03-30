import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const QUERIES = [
  "meilleurs restaurants Paris",
  "restaurants branchés Paris",
  "bistrot parisien",
  "restaurant gastronomique Paris",
  "restaurant japonais Paris",
  "restaurant italien Paris",
  "restaurant libanais Paris",
  "brasserie Paris",
  "restaurant végétarien Paris",
  "restaurant seafood Paris",
  "restaurant africain Paris",
  "restaurant mexicain Paris",
];

/** Chaînes / fast-food à exclure (correspondance partielle, insensible à la casse) */
const CHAIN_KEYWORDS = [
  "mcdonald",
  "subway",
  "kfc",
  "burger king",
  "starbucks",
  "domino",
  "pizza hut",
  "five guys",
  "chipotle",
  "taco bell",
  "quick",
  "popeyes",
  "wendy",
  "pret a manger",
  "pret-a-manger",
  "o'tacos",
  "otacos",
  "vapiano",
  "flunch",
  "buffalo grill",
  "hippopotamus",
  "leon de bruxelles",
  "léon de bruxelles",
  "paul boulangerie",
  "brioche doree",
  "brioche dorée",
];

const TYPE_TO_CUISINE = {
  french_restaurant: "Français",
  italian_restaurant: "Italien",
  japanese_restaurant: "Japonais",
  chinese_restaurant: "Chinois",
  indian_restaurant: "Indien",
  thai_restaurant: "Thaï",
  vietnamese_restaurant: "Vietnamien",
  korean_restaurant: "Coréen",
  mexican_restaurant: "Mexicain",
  spanish_restaurant: "Espagnol",
  greek_restaurant: "Grec",
  turkish_restaurant: "Turc",
  lebanese_restaurant: "Libanais",
  mediterranean_restaurant: "Méditerranéen",
  american_restaurant: "Américain",
  brazilian_restaurant: "Brésilien",
  african_restaurant: "Africain",
  seafood_restaurant: "Fruits de mer",
  vegetarian_restaurant: "Végétarien",
  vegan_restaurant: "Vegan",
  steak_house: "Grill",
  sushi_restaurant: "Sushi",
  ramen_restaurant: "Ramen",
  pizza_restaurant: "Pizza",
  hamburger_restaurant: "Burger",
  brunch_restaurant: "Brunch",
  bakery: "Boulangerie",
  cafe: "Café",
  bar: "Bar",
  brasserie: "Brasserie",
  bistro: "Bistrot",
  meal_takeaway: "À emporter",
};

function parseEnvFile(content) {
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeName(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isParisAddress(address) {
  if (!address || typeof address !== "string") return false;
  return /\b75\d{3}\b/.test(address) && /paris/i.test(address);
}

function extractDistrict(address) {
  const m = String(address ?? "").match(/\b(75\d{3})\b/);
  return m ? m[1] : null;
}

function priceLevelToRange(level) {
  if (level == null || level === undefined) return null;
  const n = Number(level);
  if (Number.isNaN(n) || n <= 0) return "€";
  if (n === 1) return "€";
  if (n === 2) return "€€";
  if (n === 3) return "€€€";
  return "€€€€";
}

function typesToCuisine(types) {
  if (!Array.isArray(types)) return ["Restaurant"];
  const out = [];
  const seen = new Set();
  for (const t of types) {
    const label = TYPE_TO_CUISINE[t];
    if (label && !seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  if (out.length === 0) {
    if (types.includes("restaurant")) out.push("Restaurant");
    else out.push("Restaurant");
  }
  return out.slice(0, 5);
}

function isFastFood(types) {
  return Array.isArray(types) && types.includes("fast_food");
}

function isChainName(name) {
  const n = normalizeName(name);
  if (!n) return true;
  return CHAIN_KEYWORDS.some((kw) => n.includes(kw));
}

async function textSearchFirstPage(query, apiKey) {
  const q = encodeURIComponent(query);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Text Search HTTP ${res.status}`);
  return res.json();
}

async function textSearchNextPage(token, apiKey) {
  await sleep(2500);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${encodeURIComponent(token)}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Text Search (page) HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const envPath = resolve(process.cwd(), ".env.local");
  const envContent = readFileSync(envPath, "utf8");
  const env = parseEnvFile(envContent);

  const googleApiKey = env.GOOGLE_PLACES_API_KEY ?? "";
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!googleApiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY manquant dans .env.local");
  }
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: existingRows, error: readError } = await supabase
    .from("restaurants")
    .select("name");

  if (readError) {
    throw new Error(`Lecture restaurants: ${readError.message}`);
  }

  const existingNames = new Set(
    (existingRows ?? []).map((r) => normalizeName(r.name)).filter(Boolean),
  );

  let totalInDb = existingNames.size;
  const TARGET_TOTAL = 200;

  console.log(`📊 Restaurants en base: ${totalInDb} — objectif total: ${TARGET_TOTAL}`);

  if (totalInDb >= TARGET_TOTAL) {
    console.log("✅ Objectif déjà atteint, rien à insérer.");
    return;
  }

  const seenPlaceIds = new Set();
  let inserted = 0;
  let queryIndex = 0;
  const MAX_QUERY_ROUNDS = 400;

  while (totalInDb < TARGET_TOTAL && queryIndex < MAX_QUERY_ROUNDS) {
    const query = QUERIES[queryIndex % QUERIES.length];
    queryIndex += 1;

    console.log(`\n🔎 Requête: "${query}"`);

    let payload = await textSearchFirstPage(query, googleApiKey);
    if (payload.status && payload.status !== "OK" && payload.status !== "ZERO_RESULTS") {
      console.warn(`⚠️ Google status: ${payload.status}`, payload.error_message ?? "");
    }

    let pages = 0;
    const maxPagesPerQuery = 3;

    while (payload?.results?.length && pages < maxPagesPerQuery) {
      for (const place of payload.results) {
        if (totalInDb >= TARGET_TOTAL) break;

        const placeId = place.place_id;
        const name = place.name;
        const formattedAddress = place.formatted_address ?? "";
        const rating = place.rating;
        const priceLevel = place.price_level;
        const types = place.types ?? [];

        if (!placeId || !name) continue;
        if (seenPlaceIds.has(placeId)) continue;
        if (isFastFood(types)) continue;
        if (isChainName(name)) continue;
        if (typeof rating !== "number" || rating < 4.0) continue;
        if (!isParisAddress(formattedAddress)) continue;

        const nn = normalizeName(name);
        if (existingNames.has(nn)) continue;

        seenPlaceIds.add(placeId);

        const row = {
          name: String(name).trim(),
          cuisine: typesToCuisine(types),
          price_range: priceLevelToRange(priceLevel),
          district: extractDistrict(formattedAddress),
          address: formattedAddress || null,
          description: null,
          photos: [],
          instagram_url: null,
          tiktok_url: null,
          is_solo_friendly: true,
        };

        const { error: insertError } = await supabase.from("restaurants").insert(row);

        if (insertError) {
          console.warn(`⚠️ Insert échoué (${name}): ${insertError.message}`);
          continue;
        }

        existingNames.add(nn);
        totalInDb += 1;
        inserted += 1;
        console.log(
          `✅ [${totalInDb}/${TARGET_TOTAL}] ${row.name} — note ${rating} — ${row.district ?? "?"}`,
        );
        await sleep(150);
      }

      const nextToken = payload.next_page_token;
      if (!nextToken || totalInDb >= TARGET_TOTAL) break;
      pages += 1;
      payload = await textSearchNextPage(nextToken, googleApiKey);
      if (payload.status && payload.status !== "OK" && payload.status !== "ZERO_RESULTS") {
        console.warn(`⚠️ Page suivante status: ${payload.status}`);
        break;
      }
    }

    await sleep(300);
  }

  const { count: finalCount, error: countError } = await supabase
    .from("restaurants")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.warn(`⚠️ Impossible de compter les lignes: ${countError.message}`);
  }

  if ((finalCount ?? totalInDb) < TARGET_TOTAL) {
    console.warn(
      `\n⚠️ Objectif ${TARGET_TOTAL} non atteint (${finalCount ?? totalInDb}). Limite de requêtes Google ou filtres trop stricts.`,
    );
  }

  console.log(
    `\n📌 Terminé. Insérés cette exécution: ${inserted}. Total en base: ${finalCount ?? totalInDb}.`,
  );
}

main().catch((e) => {
  console.error("Erreur fatale:", e.message);
  process.exit(1);
});
