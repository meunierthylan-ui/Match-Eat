import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

/** Libellés français pour les types officiels Google Places (Place Details → types[]) */
const GOOGLE_TYPE_TO_CUISINE = {
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
  middle_eastern_restaurant: "Moyen-Orient",
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
  indonesian_restaurant: "Indonésien",
  malaysian_restaurant: "Malaisien",
  singaporean_restaurant: "Singapourien",
  filipino_restaurant: "Philippin",
  peruvian_restaurant: "Péruvien",
  colombian_restaurant: "Colombien",
  argentinian_restaurant: "Argentin",
  german_restaurant: "Allemand",
  british_restaurant: "Britannique",
  irish_pub: "Pub irlandais",
  wine_bar: "Bar à vin",
  cocktail_bar: "Cocktail",
  bar: "Bar",
  pub: "Pub",
  bakery: "Boulangerie",
  cafe: "Café",
  brasserie: "Brasserie",
  bistro: "Bistrot",
  meal_takeaway: "À emporter",
  meal_delivery: "Livraison",
  ice_cream_shop: "Glacier",
  dessert_restaurant: "Desserts",
  buffet_restaurant: "Buffet",
  fine_dining_restaurant: "Gastronomique",
};

/** Plus le score est haut, plus le type est prioritaire pour l’affichage */
const TYPE_PRIORITY = {
  fine_dining_restaurant: 95,
  sushi_restaurant: 90,
  ramen_restaurant: 90,
  seafood_restaurant: 88,
  french_restaurant: 85,
  italian_restaurant: 85,
  japanese_restaurant: 85,
  chinese_restaurant: 85,
  indian_restaurant: 85,
  thai_restaurant: 85,
  vietnamese_restaurant: 85,
  korean_restaurant: 85,
  mexican_restaurant: 85,
  lebanese_restaurant: 85,
  middle_eastern_restaurant: 84,
  mediterranean_restaurant: 82,
  american_restaurant: 80,
  steak_house: 78,
  pizza_restaurant: 76,
  hamburger_restaurant: 74,
  vegetarian_restaurant: 72,
  vegan_restaurant: 72,
  brunch_restaurant: 70,
  brasserie: 68,
  bistro: 68,
  bar: 50,
  cafe: 48,
  wine_bar: 55,
  cocktail_bar: 55,
  pub: 52,
  bakery: 45,
  meal_takeaway: 20,
  meal_delivery: 20,
};

const GENERIC_TYPES = new Set([
  "establishment",
  "food",
  "point_of_interest",
  "restaurant",
  "store",
]);

/** Quand Google ne renvoie que des types génériques, on déduit la cuisine depuis le nom affiché. */
const NAME_HINT_PATTERNS = [
  { re: /japonais|japanese|ramen|sushi|izakaya|donburi|yakitori|washoku|karaage|kodawari|okinawa|tsubame|matsuyama/i, label: "Japonais" },
  { re: /italien|italian|italia|pizza|trattoria|pasta|emilia|napolitain|sicilien/i, label: "Italien" },
  { re: /libanais|lebanese|beyrouth|mezze|manakish|kaake|phénicien|ehden|jeita|assanabel/i, label: "Libanais" },
  { re: /indien|indian|curry|tandoori|krishna|bhavan|masala/i, label: "Indien" },
  { re: /thaï|thai|thailand|pad thai/i, label: "Thaï" },
  { re: /vietnam|pho|banh/i, label: "Vietnamien" },
  { re: /coréen|korean|bbq coreen/i, label: "Coréen" },
  { re: /chinois|chinese|sichuan|cantonais|dim sum/i, label: "Chinois" },
  { re: /mexicain|mexican|taco|burrito/i, label: "Mexicain" },
  { re: /africain|african|sénégalais|ethiop|couscous/i, label: "Africain" },
  { re: /grec|greek|souvlaki|gyros/i, label: "Grec" },
  { re: /turc|turkish|kebab|ocakbasi/i, label: "Turc" },
  { re: /maroc|moroccan|tajine|couscous/i, label: "Marocain" },
  { re: /fruits de mer|seafood|crabe|homard|hu[iî]tre|poisson|cabane.*mer|langouste/i, label: "Fruits de mer" },
  { re: /végétarien|vegetarian|vegan|veg |tontons veg|soya|green farmer|potager/i, label: "Végétarien" },
  { re: /brasserie/i, label: "Brasserie" },
  { re: /bistrot|bistro/i, label: "Bistrot" },
  { re: /gastronom|michelin|étoil|fine dining|épique|savoy|epicure/i, label: "Gastronomique" },
];

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

function needsCuisineFix(cuisine) {
  if (!Array.isArray(cuisine) || cuisine.length !== 1) return false;
  const only = cuisine[0];
  return only === "Restaurant" || only === "Bar" || only === "À emporter";
}

/**
 * Transforme les types Google (+ indices nom) en tableau de cuisines lisibles.
 */
function typesToCuisineArray(types, displayName) {
  const mergedTypes = Array.isArray(types) ? types : [];

  const mapped = [];
  for (const t of mergedTypes) {
    if (GENERIC_TYPES.has(t)) continue;
    const label = GOOGLE_TYPE_TO_CUISINE[t];
    if (label) {
      const prio = TYPE_PRIORITY[t] ?? 40;
      mapped.push({ type: t, label, prio });
    }
  }

  mapped.sort((a, b) => b.prio - a.prio);

  const out = [];
  const seen = new Set();
  for (const { label } of mapped) {
    if (!seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
    if (out.length >= 5) break;
  }

  const nameStr = `${displayName ?? ""}`;
  const nameHints = [];
  const seenHint = new Set();
  for (const { re, label } of NAME_HINT_PATTERNS) {
    if (re.test(nameStr) && !seenHint.has(label)) {
      seenHint.add(label);
      nameHints.push({ label, prio: 92 });
    }
  }

  if (nameHints.length > 0) {
    for (const { label } of nameHints) {
      if (!seen.has(label)) {
        seen.add(label);
        out.unshift(label);
      }
    }
  }

  if (out.length > 0) return out.slice(0, 5);

  if (mergedTypes.includes("restaurant")) return ["Restaurant"];
  if (mergedTypes.includes("bar")) return ["Bar"];
  if (mergedTypes.includes("cafe")) return ["Café"];
  return ["Restaurant"];
}

/** Text Search : place_id + types du premier résultat (souvent plus riches qu’un Details seul). */
async function fetchTextSearchFirst(name, apiKey) {
  const query = encodeURIComponent(`${name} Paris`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Text Search HTTP ${res.status}`);
  const data = await res.json();
  const first = data?.results?.[0];
  const placeId = first?.place_id;
  if (!placeId) throw new Error("Aucun place_id");
  const searchTypes = Array.isArray(first?.types) ? first.types : [];
  return { placeId, searchTypes };
}

async function fetchPlaceDetailsTypes(placeId, apiKey) {
  const fields = encodeURIComponent("name,types");
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Place Details HTTP ${res.status}`);
  const data = await res.json();
  if (data.status && data.status !== "OK") {
    throw new Error(`Place Details status=${data.status}`);
  }
  return {
    name: data?.result?.name ?? "",
    types: Array.isArray(data?.result?.types) ? data.result.types : [],
  };
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

  const { data: rows, error: readError } = await supabase
    .from("restaurants")
    .select("id,name,cuisine")
    .order("id", { ascending: true });

  if (readError) throw new Error(`Lecture: ${readError.message}`);

  const targets = (rows ?? []).filter((r) => needsCuisineFix(r.cuisine));

  console.log(`📋 ${rows?.length ?? 0} restaurants — ${targets.length} à corriger (cuisine générique).`);

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < targets.length; i += 1) {
    const r = targets[i];
    const label = `[${i + 1}/${targets.length}]`;
    try {
      const { placeId, searchTypes } = await fetchTextSearchFirst(r.name, googleApiKey);
      await sleep(200);
      const { name: googleName, types: detailTypes } = await fetchPlaceDetailsTypes(
        placeId,
        googleApiKey,
      );
      const mergedTypeSet = new Set([...searchTypes, ...detailTypes]);
      const mergedTypes = [...mergedTypeSet];
      const displayName = googleName || r.name;
      const cuisine = typesToCuisineArray(mergedTypes, displayName);

      const { error: upError } = await supabase
        .from("restaurants")
        .update({ cuisine })
        .eq("id", r.id);

      if (upError) throw new Error(upError.message);

      console.log(
        `${label} ✅ ${r.name} → [${cuisine.join(", ")}] (Google: ${displayName || "—"})`,
      );
      ok += 1;
    } catch (e) {
      console.error(`${label} ❌ ${r.name} — ${e.message}`);
      fail += 1;
    }
    await sleep(250);
  }

  console.log(`\n📌 Terminé : ${ok} mis à jour, ${fail} échecs.`);
}

main().catch((e) => {
  console.error("Erreur fatale:", e.message);
  process.exit(1);
});
