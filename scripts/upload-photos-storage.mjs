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

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function isHttpImageUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
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

  console.log(`📦 ${restaurants.length} restaurants trouvés.`);
  console.log(`🛠️ Re-upload forcé pour tous les restaurants.`);

  let okCount = 0;
  let failCount = 0;

  for (const restaurant of restaurants) {
    const { id, name } = restaurant;
    try {
      const currentPhotos = normalizePhotos(restaurant.photos);
      const sourcePhotos = currentPhotos.slice(0, 2);

      if (sourcePhotos.length === 0) {
        console.log(`⚠️ ${name} - aucune photo source, skip`);
        await sleep(300);
        continue;
      }

      const uploadedPublicUrls = [];

      for (const sourceUrl of sourcePhotos) {
        const photoNumber = uploadedPublicUrls.length + 1;
        if (!isHttpImageUrl(sourceUrl)) {
          throw new Error(`URL image invalide: ${sourceUrl}`);
        }

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

