import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

/** Remplacements exacts (après trim) sur chaque entrée */
const EXACT_REPLACEMENTS = {
  Française: "Français",
  "Bistrot Français": "Bistrot",
  "Brasserie Française": "Brasserie",
  "Gastronomique Français": "Gastronomique",
  Pho: "Vietnamien",
  Ramen: "Japonais",
  "Steak frites": "Bistrot",
  Provençal: "Français",
  "Sud-Ouest": "Français",
  Traditionnel: "Français",
  "Cuisine Moderne": "Gastronomique",
  Bouillon: "Brasserie",
};

/** Libellés à retirer du tableau (correspondance exacte après remplacements) */
const REMOVE = new Set([
  "Fast-food",
  "À emporter",
  "Livraison",
  "Art déco",
  "Historique",
  "Street food",
  "Petits plats",
  "Curry",
  "Vins",
  "Cave à vins",
  "Vins nature",
]);

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

function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

/**
 * Si le résultat n’est que ["Restaurant"], tente de récupérer des libellés plus précis
 * depuis les autres entrées du tableau d’origine (après remplacements, sans le libellé générique "Restaurant").
 * Ne modifie pas les stats (les remplacements sont déjà comptés dans la passe principale).
 */
function rescuePreciseFromOriginal(raw) {
  if (!Array.isArray(raw)) return null;

  const labels = [];
  const seen = new Set();

  for (const item of raw) {
    if (typeof item !== "string") continue;
    let s = item.trim();
    if (!s) continue;

    if (Object.prototype.hasOwnProperty.call(EXACT_REPLACEMENTS, s)) {
      s = EXACT_REPLACEMENTS[s];
    }

    if (REMOVE.has(s)) continue;
    if (s === "Restaurant") continue;

    if (!seen.has(s)) {
      seen.add(s);
      labels.push(s);
    }
  }

  return labels.length > 0 ? labels : null;
}

/**
 * @returns {{ cuisine: string[], stats: { replacements: Record<string, number>, removed: Record<string, number> }, usedEmptyFallback: boolean, usedRescue: boolean }}
 */
function normalizeCuisineRow(raw) {
  const stats = { replacements: {}, removed: {} };
  if (!Array.isArray(raw)) {
    return { cuisine: ["Restaurant"], stats, usedEmptyFallback: true, usedRescue: false };
  }

  const out = [];
  const seen = new Set();

  for (const item of raw) {
    if (typeof item !== "string") continue;
    let s = item.trim();
    if (!s) continue;

    const before = s;
    if (Object.prototype.hasOwnProperty.call(EXACT_REPLACEMENTS, s)) {
      s = EXACT_REPLACEMENTS[s];
      const key = `${before}→${s}`;
      stats.replacements[key] = (stats.replacements[key] ?? 0) + 1;
    }

    if (REMOVE.has(s)) {
      stats.removed[s] = (stats.removed[s] ?? 0) + 1;
      continue;
    }

    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }

  let usedEmptyFallback = false;
  if (out.length === 0) {
    out.push("Restaurant");
    usedEmptyFallback = true;
  }

  let usedRescue = false;
  if (out.length === 1 && out[0] === "Restaurant") {
    const rescued = rescuePreciseFromOriginal(raw);
    if (rescued) {
      usedRescue = true;
      usedEmptyFallback = false;
      return { cuisine: rescued, stats, usedEmptyFallback, usedRescue };
    }
  }

  return { cuisine: out, stats, usedEmptyFallback, usedRescue };
}

function mergeStats(global, local) {
  for (const [k, v] of Object.entries(local.replacements)) {
    global.replacements[k] = (global.replacements[k] ?? 0) + v;
  }
  for (const [k, v] of Object.entries(local.removed)) {
    global.removed[k] = (global.removed[k] ?? 0) + v;
  }
}

async function main() {
  const envPath = resolve(process.cwd(), ".env.local");
  const envContent = readFileSync(envPath, "utf8");
  const env = parseEnvFile(envContent);

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

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

  const globalStats = { replacements: {}, removed: {} };
  let updated = 0;
  let unchanged = 0;
  let defaultedToRestaurant = 0;
  let rescuedCount = 0;

  for (const row of rows ?? []) {
    const { cuisine: next, stats, usedEmptyFallback, usedRescue } = normalizeCuisineRow(
      row.cuisine,
    );
    mergeStats(globalStats, stats);

    if (arraysEqual(row.cuisine, next)) {
      unchanged += 1;
      continue;
    }

    if (usedEmptyFallback) {
      defaultedToRestaurant += 1;
    }
    if (usedRescue) {
      rescuedCount += 1;
    }

    const { error: upError } = await supabase
      .from("restaurants")
      .update({ cuisine: next })
      .eq("id", row.id);

    if (upError) {
      console.error(`❌ id=${row.id} ${row.name}: ${upError.message}`);
      continue;
    }

    updated += 1;
    console.log(`✅ [${row.id}] ${row.name}`);
    console.log(`   avant: ${JSON.stringify(row.cuisine)}`);
    const rescueNote = usedRescue ? " (secours depuis autres valeurs)" : "";
    console.log(`   après: ${JSON.stringify(next)}${rescueNote}`);
  }

  console.log("\n──────── Résumé ────────");
  console.log(`Restaurants lus : ${rows?.length ?? 0}`);
  console.log(`Mis à jour      : ${updated}`);
  console.log(`Inchangés       : ${unchanged}`);
  console.log(`Secours précis  : ${rescuedCount} (évité ["Restaurant"] grâce au tableau d’origine)`);

  const repKeys = Object.keys(globalStats.replacements);
  if (repKeys.length > 0) {
    console.log("\nRemplacements appliqués :");
    for (const k of repKeys.sort()) {
      console.log(`  ${k} : ${globalStats.replacements[k]}`);
    }
  }

  const remKeys = Object.keys(globalStats.removed);
  if (remKeys.length > 0) {
    console.log("\nValeurs retirées (occurrences) :");
    for (const k of remKeys.sort()) {
      console.log(`  "${k}" : ${globalStats.removed[k]}`);
    }
  }

  console.log(
    `\nLignes restées ["Restaurant"] (tableau vide après suppressions) : ${defaultedToRestaurant}`,
  );
}

main().catch((e) => {
  console.error("Erreur fatale:", e.message);
  process.exit(1);
});
