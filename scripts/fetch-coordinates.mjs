/**
 * Renseigne latitude et longitude à partir de google_place_id (Place Details geometry).
 * Colonnes requises : exécuter scripts/add-google-coordinates-columns.sql dans Supabase si besoin.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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

async function placeDetailsGeometry(placeId, apiKey) {
  const fields = encodeURIComponent("geometry");
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
    placeId,
  )}&fields=${fields}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Place Details HTTP ${res.status}`);
  const data = await res.json();
  if (data.status && data.status !== "OK") {
    throw new Error(`Place Details status=${data.status} ${data.error_message ?? ""}`);
  }
  const loc = data?.result?.geometry?.location;
  if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") {
    throw new Error("Pas de geometry.location valide");
  }
  return { lat: loc.lat, lng: loc.lng };
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
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: rows, error: readError } = await supabase
    .from("restaurants")
    .select("id,name,google_place_id,latitude,longitude")
    .order("id", { ascending: true });

  if (readError) throw new Error(`Lecture restaurants: ${readError.message}`);

  const list =
    rows?.filter((r) => r.google_place_id && (r.latitude == null || r.longitude == null)) ?? [];

  console.log(
    `📦 ${rows?.length ?? 0} restaurants — ${list.length} avec google_place_id sans coordonnées.\n`,
  );

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < list.length; i += 1) {
    const r = list[i];
    const tag = `[${i + 1}/${list.length}]`;
    try {
      const { lat, lng } = await placeDetailsGeometry(r.google_place_id, googleApiKey);

      const { error: upError } = await supabase
        .from("restaurants")
        .update({ latitude: lat, longitude: lng })
        .eq("id", r.id);

      if (upError) throw new Error(upError.message);

      console.log(`✅ ${r.name} - ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      ok += 1;
    } catch (e) {
      console.error(`${tag} ❌ ${r.name} — ${e.message}`);
      fail += 1;
    }

    await sleep(150);
  }

  console.log(`\n📌 Terminé : ${ok} succès, ${fail} échecs.`);
}

main().catch((e) => {
  console.error("Erreur fatale:", e.message);
  process.exit(1);
});

