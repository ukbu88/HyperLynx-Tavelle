import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema/index.js";

export type TavelleDb = ReturnType<typeof createDb>;

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
