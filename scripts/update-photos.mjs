import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function fetchRestaurants({ supabaseUrl, supabaseKey }) {
  const url = `${supabaseUrl}/rest/v1/restaurants?select=id,name,photos&order=id.asc`;
  const res = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Erreur lecture restaurants (${res.status}): ${body}`);
  }
  return res.json();
}

async function fetchRestaurantById({ supabaseUrl, supabaseKey, id }) {
  const url = `${supabaseUrl}/rest/v1/restaurants?id=eq.${id}&select=id,name,photos`;
  const res = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Erreur lecture restaurant ${id} (${res.status}): ${body}`);
  }
  const rows = await res.json();
  return rows?.[0] ?? null;
}

async function searchPlace({ apiKey, name }) {
  const query = encodeURIComponent(`${name} Paris`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google Places HTTP ${res.status}`);
  }
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places status=${data.status} (${data.error_message ?? "sans détail"})`);
  }
  return data.results?.[0] ?? null;
}

async function fetchPlaceDetailsPhotos({ apiKey, placeId }) {
  const url =
    `https://maps.googleapis.com/maps/api/place/details/json?` +
    `place_id=${encodeURIComponent(placeId)}&fields=photos&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google Place Details HTTP ${res.status}`);
  }
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Place Details status=${data.status} (${data.error_message ?? "sans détail"})`);
  }
  return data.result?.photos ?? [];
}

function photoRefToUrl(photoRef, apiKey) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(
    photoRef
  )}&key=${encodeURIComponent(apiKey)}`;
}

function collectPhotoRefs(photos) {
  if (!Array.isArray(photos)) return [];
  return photos.map((p) => p?.photo_reference).filter(Boolean);
}

function buildPhotoUrlsFromRefs({ refs, apiKey }) {
  return refs.map((ref) => photoRefToUrl(ref, apiKey));
}

async function resolveAtLeastTwoPhotoUrls({ apiKey, name }) {
  const place = await searchPlace({ apiKey, name });
  if (!place) return [];

  const refs = [];
  const seen = new Set();
  for (const ref of collectPhotoRefs(place.photos)) {
    if (!seen.has(ref)) {
      seen.add(ref);
      refs.push(ref);
    }
    if (refs.length >= 2) break;
  }

  if (refs.length < 2 && place.place_id) {
    const detailsPhotos = await fetchPlaceDetailsPhotos({
      apiKey,
      placeId: place.place_id,
    });
    for (const ref of collectPhotoRefs(detailsPhotos)) {
      if (!seen.has(ref)) {
        seen.add(ref);
        refs.push(ref);
      }
      if (refs.length >= 2) break;
    }
  }

  return buildPhotoUrlsFromRefs({ refs: refs.slice(0, 2), apiKey });
}

async function updateRestaurantPhotos({ supabaseUrl, supabaseKey, id, photoUrls }) {
  const url = `${supabaseUrl}/rest/v1/restaurants?id=eq.${id}&select=id,photos`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify({ photos: photoUrls }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Erreur update Supabase (${res.status}): ${body}`);
  }
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("0 ligne mise à jour (RLS/policies ou droits insuffisants)");
  }
  return rows[0];
}

async function main() {
  const envPath = resolve(process.cwd(), ".env.local");
  const envContent = readFileSync(envPath, "utf8");
  const env = parseEnvFile(envContent);

  const googleApiKey = env.GOOGLE_PLACES_API_KEY;
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? "";
  const readKey = supabaseServiceKey || supabaseAnonKey;
  const writeKey = supabaseServiceKey;

  if (!googleApiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY manquant dans .env.local");
  }
  if (!supabaseUrl || !readKey) {
    throw new Error("Variables Supabase de lecture manquantes dans .env.local");
  }
  if (!writeKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local : requise pour appliquer les updates de photos de façon fiable."
    );
  }

  const restaurants = await fetchRestaurants({ supabaseUrl, supabaseKey: readKey });
  console.log(`📦 ${restaurants.length} restaurants trouvés.`);

  let okCount = 0;
  let failCount = 0;

  for (const restaurant of restaurants) {
    const { id, name, photos: existingPhotos } = restaurant;
    try {
      let photoUrls = await resolveAtLeastTwoPhotoUrls({ apiKey: googleApiKey, name });

      if (photoUrls.length < 2 && Array.isArray(existingPhotos) && existingPhotos.length >= 2) {
        photoUrls = existingPhotos.slice(0, 2);
      }

      if (photoUrls.length < 2) {
        throw new Error("moins de 2 photos disponibles même après fallback Place Details");
      }

      console.log(`🖼️ ${name} - URLs trouvées:`);
      photoUrls.forEach((u, i) => console.log(`   ${i + 1}. ${u}`));

      const updated = await updateRestaurantPhotos({
        supabaseUrl,
        supabaseKey: writeKey,
        id,
        photoUrls,
      });

      const check = await fetchRestaurantById({
        supabaseUrl,
        supabaseKey: readKey,
        id,
      });

      const storedPhotos = Array.isArray(check?.photos) ? check.photos : [];
      const isApplied =
        storedPhotos.length >= 2 &&
        storedPhotos[0] === photoUrls[0] &&
        storedPhotos[1] === photoUrls[1];
      if (!isApplied) {
        throw new Error(
          `update non appliqué en base pour id=${id}. Photos en base: ${JSON.stringify(storedPhotos)}`
        );
      }

      console.log(`✅ ${name} - ${photoUrls.length} photos trouvées`);
      okCount += 1;
    } catch (error) {
      console.error(`❌ ${name} - ${error.message}`);
      failCount += 1;
    }
    await sleep(200);
  }

  console.log(`\nTerminé: ${okCount} succès, ${failCount} échecs.`);
}

main().catch((error) => {
  console.error("Erreur fatale:", error.message);
  process.exit(1);
});

