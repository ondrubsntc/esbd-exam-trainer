// JSON-file storage for single-user progress. Writes atomically (temp + rename) so a crash
// mid-write can't corrupt the file. This is the only place that touches the filesystem —
// a Supabase-backed store can replace it behind the same { getAll, saveAll } interface.
import { readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(here, "..", "progress.json");

async function getAll() {
  try {
    return JSON.parse(await readFile(FILE, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return {}; // no progress yet
    throw e;
  }
}

async function saveAll(map) {
  const tmp = `${FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(map, null, 2), "utf8");
  await rename(tmp, FILE);
  return map;
}

export default { name: "json-file", getAll, saveAll };
