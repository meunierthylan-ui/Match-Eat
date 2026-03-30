import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "restaurant-photos";

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

const TARGET_RESTAURANT_NAME = process.argv[2]?.trim() ?? "";

/** Restaurants sans photos en base (tableau vide, null, ou chaîne '{}' côté legacy). */
function needsPhotosUpload(value) {
  if (value == null) return true;
  if (typeof value === "string") {
    const t = value.trim();
    return t === "" || t === "{}";
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return true;
    const hasUrl = value.some(
      (src) => typeof src === "string" && src.trim().length > 0,
    );
    return !hasUrl;
  }
  return false;
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function buildGooglePhotoUrl(photoReference, apiKey) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photo_reference=${encodeURIComponent(photoReference)}&key=${encodeURIComponent(apiKey)}`;
}

async function fetchPlaceId(name, apiKey) {
  const query = encodeURIComponent(`${name} Paris`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Text Search HTTP ${res.status}`);
  }

  const data = await res.json();
  const placeId = data?.results?.[0]?.place_id;
  if (!placeId) {
    throw new Error("Aucun place_id trouvé");
  }

  return placeId;
}

async function fetchPlaceDetailsPhotos(placeId, apiKey) {
  const fields = encodeURIComponent("photos");
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Place Details HTTP ${res.status}`);
  }

  const data = await res.json();
  const photos = Array.isArray(data?.result?.photos) ? data.result.photos : [];
  const references = photos
    .map((photo) => photo?.photo_reference)
    .filter((ref) => typeof ref === "string" && ref.trim().length > 0);

  return references;
}

function normalizePhotos(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((src) => typeof src === "string" && src.trim().length > 0);
}

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Téléchargement image HTTP ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
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

  const { data: restaurants, error: readError } = await supabase
    .from("restaurants")
    .select("id,name,photos")
    .order("id", { ascending: true });

  if (readError) {
    throw new Error(`Erreur lecture restaurants: ${readError.message}`);
  }

  const withoutPhotos = restaurants.filter((r) => needsPhotosUpload(r.photos));

  let restaurantsToProcess = withoutPhotos;
  if (TARGET_RESTAURANT_NAME) {
    restaurantsToProcess = withoutPhotos.filter(
      (r) => r.name === TARGET_RESTAURANT_NAME,
    );
  }

  console.log(
    `📦 ${restaurants.length} restaurants en base — ${withoutPhotos.length} sans photos — ${restaurantsToProcess.length} à traiter.`,
  );
  console.log(`🛠️ Upload photos (Google Place Details → Storage) sur cette sélection.`);

  if (restaurantsToProcess.length === 0) {
    console.log("\n✅ Rien à faire (aucun restaurant sans photos dans la sélection).");
    return;
  }

  let okCount = 0;
  let failCount = 0;

  for (const restaurant of restaurantsToProcess) {
    const { id, name } = restaurant;
    try {
      const placeId = await fetchPlaceId(name, googleApiKey);
      const photoReferences = await fetchPlaceDetailsPhotos(placeId, googleApiKey);
      const uniquePhotoReferences = [...new Set(photoReferences)];
      let sourcePhotos = uniquePhotoReferences
        .slice(0, 2)
        .map((ref) => buildGooglePhotoUrl(ref, googleApiKey));

      if (sourcePhotos.length === 0) {
        const fallbackPhotos = normalizePhotos(restaurant.photos).slice(0, 2);
        if (fallbackPhotos.length === 0) {
          console.log(`⚠️ ${name} - aucune photo Google Place Details et aucun fallback en base, skip`);
          await sleep(300);
          continue;
        }
        sourcePhotos = fallbackPhotos;
        console.log(`↩️ ${name} - fallback sur photos existantes en base (${sourcePhotos.length})`);
      }

      const uploadedPublicUrls = [];

      for (const sourceUrl of sourcePhotos) {
        const photoNumber = uploadedPublicUrls.length + 1;
        const fileBuffer = await downloadImage(sourceUrl);
        const filePath = `restaurant-${id}/photo-${photoNumber}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, fileBuffer, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Upload storage (${filePath}): ${uploadError.message}`);
        }

        const { data: publicData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(filePath);

        if (!publicData?.publicUrl) {
          throw new Error(`Impossible d'obtenir l'URL publique pour ${filePath}`);
        }

        uploadedPublicUrls.push(publicData.publicUrl);
      }

      const photosArray = [...uploadedPublicUrls];
      console.log("UPDATE:", JSON.stringify(photosArray));

      const { error: updateError } = await supabase
        .from("restaurants")
        .update({ photos: photosArray })
        .eq("id", id);

      if (updateError) {
        throw new Error(`Update photos: ${updateError.message}`);
      }

      console.log(`✅ ${name} - ${photosArray.length} photo(s) uploadée(s) vers Storage`);
      okCount += 1;
    } catch (error) {
      console.error(`❌ ${name} - ${error.message}`);
      failCount += 1;
    }

    await sleep(300);
  }

  console.log(`\nTerminé: ${okCount} succès, ${failCount} échecs.`);
}

main().catch((error) => {
  console.error("Erreur fatale:", error.message);
  process.exit(1);
});

