import { createEnv } from "@t3-oss/env-nextjs";
import { defineConfig } from "drizzle-kit";
import { z } from "zod";

const drizzleEnv = createEnv({
  server: {
    DATABASE_URL: z.url(),
  },
  client: {},
  emptyStringAsUndefined: true,
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
});

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  strict: true,
  verbose: true,
  dbCredentials: {
    url: drizzleEnv.DATABASE_URL,
  },
});
