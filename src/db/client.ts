import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { env } from "../env";

import * as schema from "./schema";

function createDatabase() {
  const client = neon(env.DATABASE_URL);

  return drizzle({ client, schema });
}

const globalForDatabase = globalThis as typeof globalThis & {
  __crafterSurveyDb?: ReturnType<typeof createDatabase>;
};

export function getDb() {
  if (!globalForDatabase.__crafterSurveyDb) {
    globalForDatabase.__crafterSurveyDb = createDatabase();
  }

  return globalForDatabase.__crafterSurveyDb;
}
