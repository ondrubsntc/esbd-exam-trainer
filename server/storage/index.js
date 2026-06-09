// Storage interface: { name, getAll(): map, saveAll(map): map }.
// Swap the implementation here (e.g. a Supabase store) without touching server/index.js.
import jsonStore from "./jsonStore.js";

export const storage = jsonStore;
